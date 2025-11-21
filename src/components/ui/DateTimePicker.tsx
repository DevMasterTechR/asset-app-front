// src/components/ui/DateTimePicker.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface DateTimePickerProps {
  value?: string; // ISO 8601 format: "YYYY-MM-DDTHH:mm" or empty
  onChange: (value: string) => void;
  placeholder?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value = '', onChange }) => {
  // Soportar valor vacío. Si value está vacío devolvemos inputs vacíos.
  const parts = (value || '').split('T');
  const datePart = parts[0] || '';
  const timePart = parts[1] || '';

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value; // '' o 'YYYY-MM-DD'
    // Si falta fecha o hora, interpretamos como valor vacío
    if (!newDate) {
      onChange('');
      return;
    }
    // Si el usuario ingresó sólo la fecha sin hora, asumimos 00:00 para
    // que el valor quede consistente y el formulario acepte la fecha.
    const time = timePart || '00:00';
    onChange(`${newDate}T${time}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value; // '' o 'HH:mm'
    if (!newTime) {
      onChange('');
      return;
    }
    // Si no hay fecha aún, no establecemos la hora aislada — el formulario
    // debe pedir la fecha primero. Si existe la fecha, combinamos.
    if (!datePart) return;
    onChange(`${datePart}T${newTime}`);
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="date"
        value={datePart}
        onChange={handleDateChange}
        className="border rounded px-3 py-2 w-full"
      />
      <input
        type="time"
        value={timePart}
        onChange={handleTimeChange}
        className="border rounded px-3 py-2 w-full"
      />
    </div>
  );
};
