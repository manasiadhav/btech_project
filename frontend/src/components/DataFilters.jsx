import React, { useState } from 'react';
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Typography,
  Button,
  Slider,
  IconButton,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import DateRangeField from './DateRangeField';

const DataFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    botType: '',
    status: '',
    priority: '',
    owner: '',
    dateRange: {
      start: '2022-12-31'
    }
  });

  const handleFilterChange = (field, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  const clearFilters = () => {
    const resetFilters = {
      botType: '',
      status: '',
      priority: '',
      owner: '',
      dateRange: {
        start: '2022-12-31'
      }
    };
    setFilters(resetFilters);
    if (onFilterChange) {
      onFilterChange(resetFilters);
    }
  };

  const statuses = ['failed', 'in progress', 'pending', 'successfully ran'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const botTypes = ['scheduled', 'user activated'];
  const owners = Array.from({ length: 20 }, (_, i) => `user${i + 1}`);

  // Function to get active filter count
  const getActiveFilterCount = () => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'dateRange') {
        return count + (value.start !== '2022-12-31' ? 1 : 0);
      }
      return count + (value ? 1 : 0);
    }, 0);
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        mb: 3, 
        background: 'linear-gradient(to right, #1e3c72, #2a5298)'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
            <FilterListIcon sx={{ mr: 1 }} />
            Filter Data
          </Typography>
          {getActiveFilterCount() > 0 && (
            <Typography variant="body2" sx={{ color: '#4dabf5', mt: 0.5 }}>
              {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? 's' : ''}:
              {filters.botType && ` Bot Type: ${filters.botType},`}
              {filters.status && ` Status: ${filters.status},`}
              {filters.priority && ` Priority: ${filters.priority},`}
              {filters.owner && ` Owner: ${filters.owner},`}
              {filters.dateRange.start !== '2022-12-31' && ` Date: ${filters.dateRange.start}`}
            </Typography>
          )}
        </Box>
        <IconButton onClick={clearFilters} size="small" sx={{ color: 'white' }}>
          <ClearIcon />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {/* First row of filters */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'white' }}>Bot Type</InputLabel>
            <Select
              value={filters.botType}
              label="Bot Type"
              onChange={(e) => handleFilterChange('botType', e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                '.MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              {botTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'white' }}>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                '.MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {statuses.map(status => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'white' }}>Priority</InputLabel>
            <Select
              value={filters.priority}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                '.MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="">All Priorities</MenuItem>
              {priorities.map(priority => (
                <MenuItem key={priority} value={priority}>{priority}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'white' }}>Owner</InputLabel>
            <Select
              value={filters.owner}
              label="Owner"
              onChange={(e) => handleFilterChange('owner', e.target.value)}
              sx={{
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                '.MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="">All Owners</MenuItem>
              {owners.map(owner => (
                <MenuItem key={owner} value={owner}>{owner}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range Field */}
        <Grid item xs={12} md={3}>
          <DateRangeField
            value={filters.dateRange.start}
            onChange={(date) => handleFilterChange('dateRange', { start: date })}
          />
        </Grid>

        {/* Action buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleApplyFilters}
              sx={{
                bgcolor: '#4dabf5',
                '&:hover': { bgcolor: '#2196f3' }
              }}
            >
              Apply Filters ({Object.values(filters).filter(value => value && value !== '').length} selected)
            </Button>
            <Button
              variant="outlined"
              onClick={clearFilters}
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              Reset Filters
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DataFilters;