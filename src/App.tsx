import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  ArrowDownLeft,
  BarChart3,
  Check,
  LogOut,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  AssistantDrawer,
  AssistantMessage,
  RegisterExpensePayload,
} from './components/AssistantDrawer';
import { AuthScreen } from './components/AuthScreen';
import { DailyExpensesChart } from './components/DailyExpensesChart';
import { FinancialSummary } from './components/FinancialSummary';
import { MovementDetailView } from './components/MovementDetailView';
import { MovementsModal } from './components/MovementsModal';
import { MovementsView } from './components/MovementsView';
import { OnboardingBudgetModal } from './components/OnboardingBudgetModal';
import { RecentMovements } from './components/RecentMovements';
import { RegisterExpenseView } from './components/RegisterExpenseView';
import { RegisterIncomeView } from './components/RegisterIncomeView';
import {
  CATEGORY_META,
  CURRENT_DAY_OF_MONTH,
  formatCOP,
  formatDayDateLabel,
  formatSpanishDateFromISO,
  getBudgetDashboardData,
  MONTHLY_BUDGET_COP,
} from './data/budgetData';
import {
  auth,
  createUserBudgetProfile,
  db,
  handleFirestoreError,
  OperationType,
  saveUserMovement,
  updateUserBudget,
  updateUserDisplayName,
  UserProfileDoc,
} from './firebase';
import {
  BudgetMovement,
  ExpenseCategory,
  ExpenseRecord,
  IncomeRecord,
  ScreenView,
} from './types/budget';

const INITIAL_ASSISTANT_MESSAGE: AssistantMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  text: '¡Hola! Soy tu asistente financiero. Cuéntame qué gasto hiciste, pregúntame si te alcanza para una compra, o envíame una foto de un recibo o una nota de voz.',
};

function mapAssistantCategory(rawCategory: string): ExpenseCategory {
  const normalized = rawCategory.trim().toLowerCase();
  if (
    normalized.includes('transporte') ||
    normalized.includes('bus') ||
    normalized.includes('taxi') ||
    normalized.includes('uber') ||
    normalized.includes('pasaje')
  ) {
    return ExpenseCategory.Transporte;
  }
  if (
    normalized.includes('servicio') ||
    normalized.includes('luz') ||
    normalized.includes('agua') ||
    normalized.includes('internet') ||
    normalized.includes('gas') ||
    normalized.includes('telefon')
  ) {
    return ExpenseCategory.Servicios;
  }
  if (
    normalized.includes('ropa') ||
    normalized.includes('compra') ||
    normalized.includes('personal') ||
    normalized.includes('zapato') ||
    normalized.includes('tenis')
  ) {
    return ExpenseCategory.Ropa;
  }
  if (
    normalized.includes('entretenimiento') ||
    normalized.includes('ocio') ||
    normalized.includes('cine') ||
    normalized.includes('juego') ||
    normalized.includes('concierto')
  ) {
    return ExpenseCategory.Entretenimiento;
  }
  return ExpenseCategory.Alimentacion;
}

function formatCurrentTimeES(): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return 'Ahora';
  }
}

function getCurrentLocalDateISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultNameForUser(user: User): string {
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }
  if (user.email && user.email.includes('@')) {
    return user.email.split('@')[0];
  }
  return 'Usuario';
}

type DetailOrigin = 'dashboard' | 'movimientos' | 'modal';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileDoc | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [movements, setMovements] = useState<BudgetMovement[]>([]);
  const [screen, setScreen] = useState<ScreenView>('dashboard');
  const [previousOrigin, setPreviousOrigin] =
    useState<DetailOrigin>('dashboard');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<
    ExpenseCategory | 'all'
  >('all');
  const [confirmationText, setConfirmationText] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<
    AssistantMessage[]
  >([INITIAL_ASSISTANT_MESSAGE]);

  if (fatalError) {
    throw fatalError;
  }

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      // Reset account-specific local UI state on every auth change
      setMovements([]);
      setUserProfile(null);
      setSelectedMovementId(null);
      setIsHistoryModalOpen(false);
      setConfirmationText(null);
      setSelectedCategory('all');
      setScreen('dashboard');
      setIsAssistantOpen(false);
      setAssistantMessages([INITIAL_ASSISTANT_MESSAGE]);

      if (user) {
        setProfileLoading(true);
      } else {
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to the signed-in user's private profile and movements in Firestore
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const uid = currentUser.uid;
    const profilePath = `users/${uid}`;
    const movementsPath = `users/${uid}/movements`;

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserProfileDoc);
        } else {
          setUserProfile(null);
        }
        setProfileLoading(false);
      },
      (error) => {
        setProfileLoading(false);
        try {
          handleFirestoreError(error, OperationType.GET, profilePath);
        } catch (thrown) {
          setFatalError(
            thrown instanceof Error ? thrown : new Error(String(thrown)),
          );
        }
      },
    );

    const movementsQuery = query(
      collection(db, 'users', uid, 'movements'),
      where('ownerId', '==', uid),
    );

    const unsubscribeMovements = onSnapshot(
      movementsQuery,
      (snapshot) => {
        const docsWithTime = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as BudgetMovement & {
            createdAt?: Timestamp;
          };
          const createdMs = data.createdAt?.toMillis?.() ?? 0;
          return {
            movement: { ...data, id: docSnap.id } as BudgetMovement,
            createdMs,
          };
        });

        docsWithTime.sort((a, b) => a.createdMs - b.createdMs);
        setMovements(docsWithTime.map((entry) => entry.movement));
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, movementsPath);
        } catch (thrown) {
          setFatalError(
            thrown instanceof Error ? thrown : new Error(String(thrown)),
          );
        }
      },
    );

    return () => {
      unsubscribeProfile();
      unsubscribeMovements();
    };
  }, [authReady, currentUser]);

  const baseMonthlyBudget = userProfile?.monthlyBudget ?? MONTHLY_BUDGET_COP;
  const userName =
    userProfile?.displayName ||
    (currentUser ? getDefaultNameForUser(currentUser) : 'Usuario');

  const dashboard = useMemo(
    () => getBudgetDashboardData(movements, baseMonthlyBudget),
    [movements, baseMonthlyBudget],
  );

  const hasExpenses = useMemo(
    () => movements.some((item) => item.type === 'expense'),
    [movements],
  );

  const selectedMovement = useMemo(
    () => movements.find((item) => item.id === selectedMovementId) ?? null,
    [movements, selectedMovementId],
  );

  const openMovementDetail = (id: string, origin: DetailOrigin) => {
    setSelectedMovementId(id);
    setPreviousOrigin(origin);
    setIsHistoryModalOpen(false);
    setScreen('detalle');
  };

  const handleBackFromDetail = () => {
    if (previousOrigin === 'modal') {
      setScreen('dashboard');
      setIsHistoryModalOpen(true);
      return;
    }
    setScreen(previousOrigin);
  };

  const openRegisterExpenseScreen = () => {
    if (screen === 'dashboard' || screen === 'movimientos') {
      setPreviousOrigin(screen);
    }
    setIsHistoryModalOpen(false);
    setConfirmationText(null);
    setScreen('registrar-gasto');
  };

  const openRegisterIncomeScreen = () => {
    if (screen === 'dashboard' || screen === 'movimientos') {
      setPreviousOrigin(screen);
    }
    setIsHistoryModalOpen(false);
    setConfirmationText(null);
    setScreen('registrar-ingreso');
  };

  const handleSaveExpense = (newExpense: ExpenseRecord) => {
    if (!currentUser) return;
    setSelectedCategory('all');
    setScreen('dashboard');
    setConfirmationText(
      `Gasto registrado: ${formatCOP(newExpense.amount)} en ${CATEGORY_META[newExpense.category].label}.`,
    );
    void saveUserMovement(currentUser.uid, newExpense).catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleSaveIncome = (newIncome: IncomeRecord) => {
    if (!currentUser) return;
    setScreen('dashboard');
    setConfirmationText(
      `✅ Ingreso registrado correctamente. (+${formatCOP(newIncome.amount)} en ${newIncome.concept})`,
    );
    void saveUserMovement(currentUser.uid, newIncome).catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleUpdateBudget = (newBaseBudget: number) => {
    if (!currentUser) return;
    setConfirmationText(
      `Presupuesto base actualizado a ${formatCOP(newBaseBudget)}.`,
    );
    void updateUserBudget(currentUser.uid, newBaseBudget).catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleUpdateUserName = (nextName: string) => {
    if (!currentUser) return;
    const trimmed = nextName.trim() || 'Usuario';
    void updateUserDisplayName(currentUser.uid, trimmed).catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleAssistantAddMessage = (msg: AssistantMessage) => {
    setAssistantMessages((prev) => [...prev, msg]);
  };

  const handleAssistantRegisterExpense = (payload: RegisterExpensePayload) => {
    if (!currentUser) return;
    const parts = payload.date.split('-');
    const parsedYear = parts.length === 3 ? Number(parts[0]) : 2026;
    const parsedMonth = parts.length === 3 ? Number(parts[1]) : 11;
    const parsedDay =
      parts.length === 3 ? Number(parts[2]) : CURRENT_DAY_OF_MONTH;
    const validDay =
      !Number.isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 30
        ? parsedDay
        : CURRENT_DAY_OF_MONTH;

    const isDefaultMonth = parsedYear === 2026 && parsedMonth === 11;
    const dateLabel = isDefaultMonth
      ? formatDayDateLabel(validDay)
      : formatSpanishDateFromISO(payload.date);

    const category = mapAssistantCategory(payload.category);

    const newExpense: ExpenseRecord = {
      id: `exp-ai-${Date.now().toString().slice(-6)}`,
      type: 'expense',
      day: validDay,
      dateLabel,
      timeLabel: formatCurrentTimeES(),
      concept: payload.description,
      category,
      amount: payload.amount,
    };

    setSelectedCategory('all');
    setConfirmationText(
      `¡Listo, ${userName}! Gasto registrado por el asistente: ${formatCOP(newExpense.amount)} en ${CATEGORY_META[category].label}.`,
    );
    void saveUserMovement(currentUser.uid, newExpense).catch((err) => {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    });
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleConfirmInitialBudget = async (
    displayName: string,
    monthlyBudget: number,
  ) => {
    if (!currentUser) return;
    await createUserBudgetProfile(currentUser.uid, displayName, monthlyBudget);
  };

  // Loading state while checking auth session or loading user profile
  if (!authReady || (currentUser && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/90 bg-white/90 px-8 py-7 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.16)]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-100 border-t-[#5B3DF5]" />
          <p className="text-sm font-medium text-slate-600">
            Cargando tu presupuesto...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Auth Screen (Email/Password + Google)
  if (!currentUser) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthScreen />
      </MotionConfig>
    );
  }

  // First-time user -> Starts from zero and asks for initial monthly budget
  if (!userProfile || !userProfile.onboardingCompleted) {
    return (
      <MotionConfig reducedMotion="user">
        <OnboardingBudgetModal
          initialName={getDefaultNameForUser(currentUser)}
          userEmail={currentUser.email}
          onConfirmBudget={handleConfirmInitialBudget}
          onSignOut={handleSignOut}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
          {/* Clean, balanced top header */}
          <header className="flex flex-wrap items-center justify-between gap-4 px-1">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              <button
                type="button"
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setScreen('dashboard');
                }}
                className="cursor-pointer text-left text-base font-bold tracking-tight text-[#1e1b4b] whitespace-nowrap shrink-0 transition-colors hover:text-[#5B3DF5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] sm:text-lg"
              >
                Mi Presupuesto Mensual
              </button>

              <nav
                aria-label="Navegación principal"
                className="flex items-center gap-1 rounded-full bg-white/75 p-1 shadow-[0_2px_10px_-3px_rgba(79,70,229,0.12)] backdrop-blur-sm"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setScreen('dashboard');
                  }}
                  className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                    screen === 'dashboard'
                      ? 'bg-[#0f172a] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setScreen('movimientos');
                  }}
                  className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                    screen === 'movimientos'
                      ? 'bg-[#0f172a] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Movimientos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setScreen('detalle');
                  }}
                  className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] ${
                    screen === 'detalle'
                      ? 'bg-[#0f172a] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detalle
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <p className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0 sm:text-sm">
                {dashboard.monthName} ·{' '}
                <span className="hidden sm:inline">COP</span>
                <span className="sm:hidden">COP</span>
              </p>

              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/80 py-1 pr-1.5 pl-3 shadow-xs backdrop-blur-sm">
                <span className="max-w-[120px] truncate text-xs font-semibold text-[#1e1b4b]">
                  {userName}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  title={`Cerrar sesión (${currentUser.email ?? userName})`}
                  aria-label="Cerrar sesión"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          </header>

          {/* Confirmation feedback banner */}
          <AnimatePresence>
            {confirmationText && screen === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                role="status"
                className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span>{confirmationText}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmationText(null)}
                  aria-label="Cerrar confirmación"
                  className="cursor-pointer rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Screen with Smooth Transitions */}
          <main>
            <AnimatePresence mode="wait">
              {screen === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-7"
                >
                  <FinancialSummary
                    monthName={dashboard.monthName}
                    currentDay={dashboard.currentDay}
                    totalDays={dashboard.totalDays}
                    remainingDays={dashboard.remainingDays}
                    baseMonthlyBudget={dashboard.baseMonthlyBudget}
                    totalIncome={dashboard.totalIncome}
                    monthlyBudget={dashboard.monthlyBudget}
                    totalSpent={dashboard.totalSpent}
                    availableBalance={dashboard.availableBalance}
                    spentPercentage={dashboard.spentPercentage}
                    availablePercentage={dashboard.availablePercentage}
                    dailyAverageSpent={dashboard.dailyAverageSpent}
                    dailyAvailableMargin={dashboard.dailyAvailableMargin}
                    onUpdateBudget={handleUpdateBudget}
                  />

                  {/* Centered Quick Actions Container */}
                  <section
                    aria-labelledby="acciones-rapidas-titulo"
                    className="mx-auto w-full max-w-[540px] rounded-[22px] border border-white/90 bg-white/95 px-5 py-4 shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:px-6 sm:py-5"
                  >
                    <h2
                      id="acciones-rapidas-titulo"
                      className="mb-3 text-center text-xs font-semibold text-slate-500 sm:text-[13px]"
                    >
                      Acciones rápidas
                    </h2>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <button
                        type="button"
                        onClick={openRegisterIncomeScreen}
                        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/95 px-5 text-sm font-semibold text-emerald-700 whitespace-nowrap shadow-[0_6px_18px_-6px_rgba(16,185,129,0.25)] transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        <ArrowDownLeft
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Registrar ingreso</span>
                      </button>

                      <button
                        type="button"
                        onClick={openRegisterExpenseScreen}
                        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-5 text-sm font-semibold text-white whitespace-nowrap shadow-[0_6px_20px_-6px_rgba(91,61,245,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Registrar gasto</span>
                      </button>
                    </div>
                  </section>

                  {/* Normal populated Dashboard vs Empty Dashboard inside main Dashboard */}
                  {hasExpenses ? (
                    <div className="grid grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-12">
                      <div className="lg:col-span-7">
                        <DailyExpensesChart
                          dailySeries={dashboard.dailySeries}
                          monthlyBudget={dashboard.monthlyBudget}
                          currentDay={dashboard.currentDay}
                          selectedCategory={selectedCategory}
                          onSelectCategory={setSelectedCategory}
                        />
                      </div>

                      <div className="lg:col-span-5">
                        <RecentMovements
                          movements={dashboard.recentMovements}
                          onViewAll={() => setIsHistoryModalOpen(true)}
                          onSelectMovement={(id) =>
                            openMovementDetail(id, 'dashboard')
                          }
                        />
                      </div>
                    </div>
                  ) : movements.length > 0 ? (
                    <div className="grid grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-12">
                      <section
                        aria-labelledby="dashboard-vacio-titulo"
                        className="flex flex-col items-center justify-center rounded-[24px] border border-white/90 bg-white/95 p-8 text-center shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:p-10 lg:col-span-7"
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#5B3DF5]"
                          aria-hidden="true"
                        >
                          <BarChart3 className="h-6 w-6" />
                        </div>
                        <h3
                          id="dashboard-vacio-titulo"
                          className="mt-4 text-lg font-bold tracking-tight text-[#0f172a] sm:text-xl"
                        >
                          Aún no hay gastos este mes
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                          Registra el primero y empieza a ver en qué se va la plata
                        </p>
                        <button
                          type="button"
                          onClick={openRegisterExpenseScreen}
                          className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(91,61,245,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                        >
                          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Registrar tu primer gasto</span>
                        </button>
                      </section>

                      <div className="lg:col-span-5">
                        <RecentMovements
                          movements={dashboard.recentMovements}
                          onViewAll={() => setIsHistoryModalOpen(true)}
                          onSelectMovement={(id) =>
                            openMovementDetail(id, 'dashboard')
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <section
                      aria-labelledby="dashboard-vacio-titulo"
                      className="flex flex-col items-center justify-center rounded-[24px] border border-white/90 bg-white/95 px-6 py-12 text-center shadow-[0_14px_42px_-16px_rgba(67,56,202,0.14)] backdrop-blur-sm sm:py-14"
                    >
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-[#5B3DF5]"
                        aria-hidden="true"
                      >
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <h3
                        id="dashboard-vacio-titulo"
                        className="mt-5 text-xl font-bold tracking-tight text-[#0f172a] sm:text-2xl"
                      >
                        Aún no hay gastos este mes
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                        Registra el primero y empieza a ver en qué se va la plata
                      </p>
                      <button
                        type="button"
                        onClick={openRegisterExpenseScreen}
                        className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(91,61,245,0.55)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Registrar tu primer gasto</span>
                      </button>
                    </section>
                  )}
                </motion.div>
              )}

              {screen === 'movimientos' && (
                <motion.div
                  key="movimientos"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <MovementsView
                    movements={dashboard.chronologicalMovements}
                    monthName={dashboard.monthName}
                    onSelectMovement={(id) =>
                      openMovementDetail(id, 'movimientos')
                    }
                    onBackToDashboard={() => setScreen('dashboard')}
                    onRegisterExpense={openRegisterExpenseScreen}
                  />
                </motion.div>
              )}

              {screen === 'detalle' && (
                <motion.div
                  key="detalle"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <MovementDetailView
                    movement={selectedMovement}
                    monthlyBudget={dashboard.monthlyBudget}
                    totalSpent={dashboard.totalSpent}
                    onBack={handleBackFromDetail}
                  />
                </motion.div>
              )}

              {screen === 'registrar-gasto' && (
                <motion.div
                  key="registrar-gasto"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <RegisterExpenseView
                    onSaveExpense={handleSaveExpense}
                    onCancel={() =>
                      setScreen(
                        previousOrigin === 'movimientos'
                          ? 'movimientos'
                          : 'dashboard',
                      )
                    }
                  />
                </motion.div>
              )}

              {screen === 'registrar-ingreso' && (
                <motion.div
                  key="registrar-ingreso"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <RegisterIncomeView
                    onSaveIncome={handleSaveIncome}
                    onCancel={() =>
                      setScreen(
                        previousOrigin === 'movimientos'
                          ? 'movimientos'
                          : 'dashboard',
                      )
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* History Modal opened when tapping "Ver todo" in Últimos movimientos */}
        <MovementsModal
          isOpen={isHistoryModalOpen}
          movements={dashboard.chronologicalMovements}
          monthName={dashboard.monthName}
          onClose={() => setIsHistoryModalOpen(false)}
          onSelectMovement={(id) => openMovementDetail(id, 'modal')}
        />

        {/* Floating Assistant Trigger Button */}
        {!isAssistantOpen && (
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            aria-label="Abrir asistente financiero"
            className="fixed right-5 bottom-5 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#5B3DF5] px-4 py-3 text-xs font-semibold text-white shadow-[0_12px_28px_-6px_rgba(91,61,245,0.6)] transition-all hover:-translate-y-0.5 hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] sm:right-6 sm:bottom-6 sm:px-5 sm:text-sm"
          >
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Asistente financiero</span>
          </button>
        )}

        {/* AI Assistant Drawer */}
        <AssistantDrawer
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          messages={assistantMessages}
          onAddMessage={handleAssistantAddMessage}
          onRegisterExpense={handleAssistantRegisterExpense}
          onUpdateUserName={handleUpdateUserName}
          budgetContext={{
            userName,
            monthName: dashboard.monthName,
            currentDateISO: getCurrentLocalDateISO(),
            monthlyBudget: dashboard.monthlyBudget,
            totalIncome: dashboard.totalIncome,
            totalSpent: dashboard.totalSpent,
            availableBalance: dashboard.availableBalance,
            spentPercentage: dashboard.spentPercentage,
            recentMovements: dashboard.recentMovements,
          }}
        />
      </div>
    </MotionConfig>
  );
}
