import React, { useState } from 'react';
import { 
  Paper, 
  Stack, 
  TextField, 
  MenuItem, 
  FormControl,
  InputLabel,
  Select,
  Box,
  Button,
  Slider,
  Typography,
  IconButton,
  Tooltip,
  Collapse,
  Chip
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

export default function FilterBar({ 
  onFilterChange, 
  users = [], 
  botTypes = ["scheduled", "user activated"],
  priorities = ["Low", "Medium", "High", "Critical"],
  statuses = ["failed", "in progress", "pending", "successfully ran"]
}) {
  const [filters, setFilters] = useState({
    user: '',
    botType: '',
    priority: '',
    startDate: '2022-12-31',
    endDate: '2023-02-19',
    status: '',
    successRate: [0, 100],
    executionTime: [0, 10],
    version: '',
    runCount: [0, 500]
  });

  const [expanded, setExpanded] = useState(false);

  const handleChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleRangeChange = (field) => (_, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleDateChange = (field) => (date) => {
    const newFilters = {
      ...filters,
      [field]: date
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      user: '',
      botType: '',
      priority: '',
      startDate: '2022-12-31',
      endDate: '2023-02-19',
      status: '',
      successRate: [0, 100],
      executionTime: [0, 10],
      version: '',
      runCount: [0, 500]
    };
    setFilters(resetFilters);
    onFilterChange?.(resetFilters);
  };

  const versionOptions = Array.from({ length: 59 }, (_, i) => `v${Math.floor((i + 1) / 10)}.${(i + 1) % 10}`);

  const getActiveFilters = () => {
    return Object.entries(filters).filter(([key, value]) => {
      if (Array.isArray(value)) {
        if (key === 'successRate') return value[0] !== 0 || value[1] !== 100;
        if (key === 'executionTime') return value[0] !== 0 || value[1] !== 10;
        if (key === 'runCount') return value[0] !== 0 || value[1] !== 500;
        return false;
      }
      return value && value !== '';
    });
  };

  return (
    <Box>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3, 
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterAltIcon sx={{ mr: 1 }} />
            Filters
          </Typography>
          <Tooltip title={expanded ? "Show Less" : "Show More Filters"}>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              sx={{ color: 'white' }}
            >
              {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Stack spacing={2}>
          <Stack 
            direction={{ xs: 'column', md: 'row' }} 
            spacing={2} 
            alignItems="center"
          >
            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel sx={{ color: 'white' }}>User</InputLabel>
              <Select
                value={filters.user}
                label="User"
                onChange={handleChange('user')}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                }}
              >
                <MenuItem value="">All Users</MenuItem>
                {users.map(user => (
                  <MenuItem key={user} value={user}>{user}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel sx={{ color: 'white' }}>Bot Type</InputLabel>
              <Select
                value={filters.botType}
                label="Bot Type"
                onChange={handleChange('botType')}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                }}
              >
                <MenuItem value="">All Types</MenuItem>
                {botTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel sx={{ color: 'white' }}>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={handleChange('priority')}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                }}
              >
                <MenuItem value="">All Priorities</MenuItem>
                {priorities.map(priority => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel sx={{ color: 'white' }}>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={handleChange('status')}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {statuses.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Collapse in={expanded}>
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>Success Rate (%)</Typography>
                <Slider
                  value={filters.successRate}
                  onChange={handleRangeChange('successRate')}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  sx={{
                    color: '#64b5f6',
                    '& .MuiSlider-valueLabel': { bgcolor: '#64b5f6' }
                  }}
                />
              </Box>

              <Box>
                <Typography gutterBottom>Execution Time (seconds)</Typography>
                <Slider
                  value={filters.executionTime}
                  onChange={handleRangeChange('executionTime')}
                  valueLabelDisplay="auto"
                  min={0}
                  max={10}
                  step={0.1}
                  sx={{
                    color: '#64b5f6',
                    '& .MuiSlider-valueLabel': { bgcolor: '#64b5f6' }
                  }}
                />
              </Box>

              <Box>
                <Typography gutterBottom>Run Count</Typography>
                <Slider
                  value={filters.runCount}
                  onChange={handleRangeChange('runCount')}
                  valueLabelDisplay="auto"
                  min={0}
                  max={500}
                  sx={{
                    color: '#64b5f6',
                    '& .MuiSlider-valueLabel': { bgcolor: '#64b5f6' }
                  }}
                />
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'white' }}>Version</InputLabel>
                  <Select
                    value={filters.version}
                    label="Version"
                    onChange={handleChange('version')}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                    }}
                  >
                    <MenuItem value="">All Versions</MenuItem>
                    {versionOptions.map(version => (
                      <MenuItem key={version} value={version}>{version}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Start Date (Dec 31, 2022 - Feb 19, 2023)"
                  type="date"
                  value={filters.startDate || '2022-12-31'}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (selectedDate >= "2022-12-31" && selectedDate <= "2023-02-19") {
                      handleDateChange('startDate')(selectedDate);
                    }
                  }}
                  inputProps={{
                    min: "2022-12-31",
                    max: "2023-02-19"
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    '& label': { color: 'white' },
                    '& input': { color: 'white' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                  }}
                />

                <TextField
                  label="End Date (Dec 31, 2022 - Feb 19, 2023)"
                  type="date"
                  value={filters.endDate || '2023-02-19'}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (selectedDate >= "2022-12-31" && selectedDate <= "2023-02-19") {
                      handleDateChange('endDate')(selectedDate);
                    }
                  }}
                  inputProps={{
                    min: "2022-12-31",
                    max: "2023-02-19"
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    '& label': { color: 'white' },
                    '& input': { color: 'white' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }
                  }}
                />
              </Stack>
            </Stack>
          </Collapse>

          <Stack 
            direction="row" 
            spacing={2} 
            justifyContent="flex-end"
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<FilterAltIcon />}
              onClick={() => onFilterChange?.(filters)}
              sx={{ 
                bgcolor: '#3b82f6', 
                '&:hover': { bgcolor: '#2563eb' }
              }}
            >
              Apply Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              sx={{ 
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: '#e5e7eb',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Reset
            </Button>
          </Stack>

          {getActiveFilters().length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {getActiveFilters().map(([key, value]) => (
                <Chip
                  key={key}
                  label={Array.isArray(value) 
                    ? `${key}: ${value[0]}-${value[1]}`
                    : `${key}: ${value}`
                  }
                  onDelete={() => {
                    const resetValue = Array.isArray(value)
                      ? key === 'successRate' ? [0, 100]
                        : key === 'executionTime' ? [0, 10]
                        : [0, 500]
                      : '';
                    handleChange(key)({ target: { value: resetValue } });
                  }}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '& .MuiChip-deleteIcon': {
                      color: 'white',
                      '&:hover': { color: '#e5e7eb' }
                    }
                  }}
                />
              ))}
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}