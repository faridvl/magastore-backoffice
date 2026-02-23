import { ReactElement } from 'react';

type Props = {
  children: JSX.Element | ReactElement | null;
  className?: string;
};

export function DesktopView({ children, className }: Props): JSX.Element | null {
  const isDesktop = true; // Reemplaza con la lógica para determinar si es un entorno de escritorio

  if (!isDesktop) {
    return null; // Devuelve null si no es un entorno de escritorio
  }

  // Si no se proporciona className o es una cadena vacía, retorna los children directamente
  if (!className || className.trim() === '') {
    return children;
  }

  // Si se proporciona className, envuelve los children en un div con esa clase
  return <div className={className}>{children}</div>;
}
