// src/components/ui/DateTimePicker.tsx

import React from 'react';

interface DateTimePickerProps {
  value: string; // ISO 8601 format: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange }) => {
  // Dividir fecha y hora
  const [datePart, timePart] = value.split('T');

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    onChange(`${newDate}T${timePart}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
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
