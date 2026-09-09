import React from 'react';
import { Box, MenuItem, TextField } from '@mui/material';

interface ColorOption {
  id: number;
  name: string;
  color?: string | null;
}

interface ColorOptionSelectProps {
  label: string;
  name: 'status_id' | 'priority_id';
  value: number | string | null;
  options: ColorOption[];
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ColorOptionSelect: React.FC<ColorOptionSelectProps> = ({
  label,
  name,
  value,
  options,
  handleChange,
}) => (
  <TextField
    select
    fullWidth
    label={label}
    name={name}
    value={value || ''}
    onChange={handleChange}
    required
    sx={{ mb: 2 }}
  >
    {options.map((option) => (
      <MenuItem key={option.id} value={option.id}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {option.color && (
            <Box
              aria-hidden="true"
              sx={{
                width: 16,
                height: 16,
                borderRadius: 0.5,
                backgroundColor: option.color,
                flexShrink: 0,
              }}
            />
          )}
          {option.name}
        </Box>
      </MenuItem>
    ))}
  </TextField>
);
