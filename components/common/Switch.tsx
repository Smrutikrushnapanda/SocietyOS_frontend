import React from 'react';
import clsx from 'clsx';

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  className,
  id,
  ...props
}) => {
  return (
    <label className={clsx('switch', className)}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <span className="switch-slider"></span>
    </label>
  );
};
