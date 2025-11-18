import React from "react";
import type { ToastState } from "../types";

interface Props {
  toast: ToastState | null;
}

const Toast: React.FC<Props> = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`toast show`} data-type={toast.type}>
      {toast.message}
    </div>
  );
};

export default Toast;
