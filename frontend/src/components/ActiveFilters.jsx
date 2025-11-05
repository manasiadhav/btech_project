import React from 'react';
import { Box, Chip, Typography, Paper } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

const ActiveFilters = ({ filters }) => {
  const getActiveFilters = () => {
    const active = [];
    
    if (filters.botType) {
      active.push({ key: 'botType', label: `Bot Type: ${filters.botType}` });
    }
    if (filters.status) {
      active.push({ key: 'status', label: `Status: ${filters.status}` });
    }
    if (filters.priority) {
      active.push({ key: 'priority', label: `Priority: ${filters.priority}` });
    }
    if (filters.owner) {
      active.push({ key: 'owner', label: `Owner: ${filters.owner}` });
    }
    if (filters.dateRange?.start && filters.dateRange.start !== '2022-12-31') {
      active.push({ key: 'date', label: `Date: ${filters.dateRange.start}` });
    }
    
    return active;
  };

  const activeFilters = getActiveFilters();
  
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 3, 
        backgroundColor: 'rgba(25, 118, 210, 0.04)',
        border: '1px solid rgba(25, 118, 210, 0.12)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle1" color="primary" fontWeight="medium">
          Active Filters ({activeFilters.length})
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {activeFilters.map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            variant="outlined"
            color="primary"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderColor: 'rgba(25, 118, 210, 0.3)',
              '& .MuiChip-label': {
                fontWeight: 500
              }
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default ActiveFilters;