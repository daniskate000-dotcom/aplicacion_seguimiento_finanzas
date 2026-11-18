import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readableMessage =
      'Ocurrió un error inesperado al cargar tu información.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      if (parsed && typeof parsed.error === 'string') {
        if (parsed.error.toLowerCase().includes('quota')) {
          readableMessage =
            'Se alcanzó el límite diario de consultas de la base de datos. Intenta nuevamente mañana.';
        } else if (parsed.error.toLowerCase().includes('permission')) {
          readableMessage =
            'No tienes permisos para acceder a este recurso con la sesión actual.';
        } else {
          readableMessage = parsed.error;
        }
      }
    } catch {
      if (error.message) {
        readableMessage = error.message;
      }
    }
    return { hasError: true, message: readableMessage };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-[24px] border border-white/90 bg-white/95 p-7 text-center shadow-[0_18px_48px_-16px_rgba(67,56,202,0.18)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-[#0f172a]">
              Algo salió mal
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(91,61,245,0.55)] transition-all hover:bg-[#4b2ee3]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Recargar aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
