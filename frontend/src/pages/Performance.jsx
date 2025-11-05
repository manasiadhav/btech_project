import React, { useEffect, useState } from 'react';
import { Box, Typography, TablePagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPerformance } from '../api';

export default function Performance() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        console.log('Fetching performance data...');
        const response = await getPerformance();
        console.log('Received data:', response);
        
        if (!mounted) {
          console.log('Component unmounted, not updating state');
          return;
        }

        if (!response || !response.performance || !response.time_series) {
          console.error('Invalid data structure:', response);
          throw new Error('Invalid performance data received');
        }

        setData(response);
        setError(null);
      } catch (err) {
        console.error('Error in performance data fetch:', err);
        if (mounted) {
          setError('Failed to load performance data. Please try again. ' + (err.message || ''));
          setData(null);
        }
      }
    };

    fetchData();
    return () => {
      console.log('Cleaning up performance component');
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 2, bgcolor: '#fee2e2', color: '#991b1b' }}>
          <Typography variant="body1">{error}</Typography>
        </Paper>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1">Loading performance data...</Typography>
        </Paper>
      </Box>
    );
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{
          mb: 3,
          background: 'linear-gradient(45deg, #1a365d 30%, #2563eb 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}
      >
        Performance Metrics
      </Typography>

      {/* Success Rate Graph */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>Success Rate Trend</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.time_series || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value) => [`${value.toFixed(1)}%`, 'Success Rate']}
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <Line
              type="monotone"
              dataKey="avg_success_rate"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name="Success Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Performance Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }} elevation={3}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            Per-bot Performance Details
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Total Bots: {data.performance.length}
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Bot</TableCell>
                <TableCell align="right">Avg Exec (s)</TableCell>
                <TableCell align="right">Success Rate (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.performance
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow hover key={index}>
                    <TableCell component="th" scope="row">
                      {row.bot_name}
                    </TableCell>
                    <TableCell align="right">{row.avg_execution_time_s?.toFixed(2)}</TableCell>
                    <TableCell align="right">{row.success_rate?.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 500]}
          component="div"
          count={data.performance.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}
