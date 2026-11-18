import { FormEvent, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { auth, googleProvider } from '../firebase';

type AuthMode = 'login' | 'register';

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Este correo ya está registrado. Inicia sesión con tu contraseña o entra con Google.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'Ingresa un correo electrónico válido.';
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de Google antes de finalizar el inicio de sesión.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El acceso con correo y contraseña aún no está habilitado en Firebase Console (Authentication > Sign-in method > Email/Password). Puedes habilitarlo allí o entrar rápido con Google.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos seguidos. Espera unos minutos e intenta nuevamente.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet e intenta otra vez.';
    default:
      return err instanceof Error && err.message
        ? err.message
        : 'No fue posible iniciar sesión. Intenta de nuevo.';
  }
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          password,
        );
        const trimmedName = name.trim();
        if (trimmedName) {
          await updateProfile(credential.user, { displayName: trimmedName });
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isBusy = isSubmitting || isGoogleLoading;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-[28px] border border-white/90 bg-white/95 p-6 shadow-[0_22px_60px_-18px_rgba(67,56,202,0.2)] backdrop-blur-sm sm:p-8"
      >
        {/* Brand Header */}
        <div className="text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5B3DF5] text-white shadow-[0_8px_22px_-6px_rgba(91,61,245,0.55)]"
            aria-hidden="true"
          >
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1e1b4b]">
            Mi Presupuesto Mensual
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Tu espacio privado para controlar tus finanzas en COP
          </p>
        </div>

        {/* Mode Switcher */}
        <div
          role="tablist"
          aria-label="Opciones de acceso"
          className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-slate-100/90 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`cursor-pointer rounded-full py-2 text-xs font-semibold transition-all sm:text-sm ${
              mode === 'login'
                ? 'bg-white text-[#0f172a] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`cursor-pointer rounded-full py-2 text-xs font-semibold transition-all sm:text-sm ${
              mode === 'register'
                ? 'bg-white text-[#0f172a] shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-800"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Google Sign-In */}
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isBusy}
          className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0f172a] shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span>
            {isGoogleLoading ? 'Conectando con Google...' : 'Entrar rápido con Google'}
          </span>
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-medium text-slate-400">
            o con tu correo y contraseña
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Nombre
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Tu nombre (ej. Camila)"
                  autoComplete="name"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pr-4 pl-10 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pr-4 pl-10 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pr-11 pl-10 text-sm text-[#0f172a] placeholder:text-slate-400 focus:border-[#5B3DF5] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#5B3DF5] px-5 text-sm font-semibold text-white shadow-[0_8px_22px_-6px_rgba(91,61,245,0.55)] transition-all hover:bg-[#4b2ee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? mode === 'register'
                ? 'Creando tu cuenta...'
                : 'Ingresando...'
              : mode === 'register'
                ? 'Crear mi cuenta'
                : 'Entrar a mi presupuesto'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
