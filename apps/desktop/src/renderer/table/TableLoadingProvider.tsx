import { createContext, useContext, type ReactNode } from "react";

export interface TableLoadingContextValue {
  readonly busy: boolean;
  readonly loadError: string | null;
  readonly onRetry?: () => void;
}

const TableLoadingCtx = createContext<TableLoadingContextValue | null>(null);

export const TableLoadingProvider = ({
  busy,
  loadError,
  onRetry,
  children,
}: TableLoadingContextValue & { readonly children: ReactNode }) => (
  <TableLoadingCtx.Provider value={{ busy, loadError, onRetry }}>
    {children}
  </TableLoadingCtx.Provider>
);

export const useTableLoading = (): TableLoadingContextValue => {
  const ctx = useContext(TableLoadingCtx);
  if (ctx === null) {
    throw new Error("useTableLoading must be used within a TableLoadingProvider");
  }
  return ctx;
};