import { createContext, useContext, useState, type ReactNode } from "react";
import { Info, XCircle, AlertTriangle, CheckCircle } from "lucide-react";
import React from "react";

export interface AlertProps {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  button?: {
    text: string;
    href: string;
  };
}

const variantStyles = {
  success: {
    container: "border-emerald-500 text-emerald-500 bg-emerald-50 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10",
    icon: "text-emerald-500",
    Icon: CheckCircle
  },
  error: {
    container: "border-red-500 text-red-500 bg-red-50 backdrop-blur-sm dark:border-red-500/30 dark:bg-red-500/10",
    icon: "text-red-500",
    Icon: XCircle
  },
  warning: {
    container: "border-yellow-500 text-yellow-500 bg-yellow-50 backdrop-blur-sm dark:border-yellow-500/30 dark:bg-yellow-500/10",
    icon: "text-yellow-500",
    Icon: AlertTriangle
  },
  info: {
    container: "border-blue-500 text-blue-500 bg-blue-50 backdrop-blur-sm dark:border-blue-500/30 dark:bg-blue-500/10",
    icon: "text-blue-500",
    Icon: Info
  }
};

function SmallAlert({ alert }: { alert: AlertProps }) {
  const styles = variantStyles[alert.variant];
  const Icon = styles.Icon;

  // Icon background color per variant (soft, subtle)
  const iconBg = {
    success: "bg-emerald-500/[0.08] text-emerald-500",
    error: "bg-red-500/[0.08] text-red-500",
    warning: "bg-yellow-500/[0.08] text-yellow-500",
    info: "bg-blue-500/[0.08] text-blue-500"
  }[alert.variant];

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-lg">
      <div className="flex items-center gap-3 mb-1">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">{alert.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.message}</p>
        </div>
      </div>
    </div>
  );
}

interface AlertContextValue {
  showAlert: (alertProps: AlertProps) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used within an AlertProvider");
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<{ id: number; alert: AlertProps }[]>([]);
  const nextId = React.useRef(0);

  const showAlert = (alertProps: AlertProps) => {
    const id = nextId.current++;
    setAlerts((prev) => [...prev, { id, alert: alertProps }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 8000);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div className="fixed top-5 right-5 z-[100000] flex flex-col gap-4 w-96">
        {alerts.map(({ id, alert }) => (
          <SmallAlert key={id} alert={alert} />
        ))}
      </div>
    </AlertContext.Provider>
  );
}; 