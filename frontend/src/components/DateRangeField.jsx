import React from 'react';
import { FormControl, TextField } from '@mui/material';

export default function DateRangeField({ value, onChange }) {
  return (
    <FormControl fullWidth>
      <TextField
        label="Date (Dec 31, 2022 - Feb 19, 2023)"
        type="date"
        value={value}
        onChange={(e) => {
          const selectedDate = e.target.value;
          if (selectedDate >= "2022-12-31" && selectedDate <= "2023-02-19") {
            onChange(selectedDate);
          }
        }}
        InputLabelProps={{ 
          shrink: true,
          sx: { color: 'white' }
        }}
        inputProps={{
          min: "2022-12-31",
          max: "2023-02-19"
        }}
        defaultValue="2022-12-31"
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
          },
          '& input': { color: 'white' }
        }}
      />
    </FormControl>
  );
}