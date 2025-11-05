
import React, { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Grid, Box, useTheme } from '@mui/material'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getOverview, getSummary } from '../api'
import DataFilters from '../components/DataFilters'
import ActiveFilters from '../components/ActiveFilters'

export default function Overview(){
  const theme = useTheme();
  const [overview, setOverview] = useState({
    total_bots: 0,
    active_bots: 0,
    avg_success_rate: 0,
    avg_execution_time_s: 0,
    time_series: []
  })
  const [summary, setSummary] = useState({
    total_runs: 0,
    total_failures: 0,
    global_success_rate: 0,
    bots_with_critical_priority: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState({
    botType: '',
    status: '',
    priority: '',
    owner: '',
    dateRange: {
      start: '2022-12-31'
    }
  })

  const [filters, setFilters] = useState({
    botType: '',
    status: '',
    priority: '',
    owner: '',
    dateRange: {
      start: '2022-12-31'
    }
  });

  // Fetch data with filters
  const fetchData = async (currentFilters) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (currentFilters.botType) params.append('bot_type', currentFilters.botType);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.priority) params.append('priority', currentFilters.priority);
      if (currentFilters.owner) params.append('owner', currentFilters.owner);
      if (currentFilters.dateRange?.start) params.append('start_date', currentFilters.dateRange.start);

      console.log('Fetching data with params:', params.toString());

      const [newOverview, newSummary] = await Promise.all([
        getOverview(params).catch(err => {
          console.error('Error fetching overview:', err);
          return {
            total_bots: 0,
            active_bots: 0,
            avg_success_rate: 0,
            avg_execution_time_s: 0,
            time_series: []
          };
        }),
        getSummary(params).catch(err => {
          console.error('Error fetching summary:', err);
          return {
            total_runs: 0,
            total_failures: 0,
            global_success_rate: 0,
            bots_with_critical_priority: 0
          };
        })
      ]);

      console.log('Received overview data:', newOverview);
      console.log('Received summary data:', newSummary);

      setOverview(newOverview);
      setSummary(newSummary);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filters);
  }, [filters]); // Fetch when filters change

  if(!overview || !summary) return (
    <Card sx={{p:2, mb:2}}>
      <Typography>Loading overview...</Typography>
    </Card>
  )

  if(isLoading) return (
    <Card sx={{p:2, mb:2}}>
      <Typography>Updating data...</Typography>
    </Card>
  )

  const formatChartData = (data) => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return [];
    }
    
    return data.time_series.map(point => ({
      time: new Date(point.timestamp).toLocaleDateString(),
      running: point.active_bots,
      success_rate: point.success_rate,
      execution_time: point.avg_execution_time,
      noData: false
    }));
  };

  const handleFilterChange = async (newFilters) => {
    try {
      setActiveFilters(newFilters);
      setIsLoading(true);
      
      // Prepare query parameters
      const params = new URLSearchParams();
      if (newFilters.botType) params.append('bot_type', newFilters.botType);
      if (newFilters.status) params.append('status', newFilters.status);
      if (newFilters.priority) params.append('priority', newFilters.priority);
      if (newFilters.owner) params.append('owner', newFilters.owner);
      if (newFilters.dateRange?.start) params.append('start_date', newFilters.dateRange.start);
      
      console.log('Applying filters:', newFilters);
      console.log('Query params:', params.toString());
      
      // Fetch filtered data
      const [newOverview, newSummary] = await Promise.all([
        getOverview(params),
        getSummary(params)
      ]);
      
      console.log('Received filtered data:', newOverview);
      
      setOverview(newOverview);
      setSummary(newSummary);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setIsLoading(false);
    }
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
        Bot Monitoring Dashboard
      </Typography>

      <DataFilters onFilterChange={handleFilterChange} />
      <ActiveFilters filters={activeFilters} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            transform: 'translateY(0)',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-5px)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>Total Bots</Typography>
              <Typography variant="h3">{overview.total_bots}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            transform: 'translateY(0)',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-5px)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>Active Bots</Typography>
              <Typography variant="h3">{overview.active_bots}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            transform: 'translateY(0)',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-5px)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>Success Rate</Typography>
              <Typography variant="h3">{overview.avg_success_rate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            transform: 'translateY(0)',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'translateY(-5px)'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>Avg Execution</Typography>
              <Typography variant="h3">{Math.round(overview.avg_execution_time_s*100)/100}s</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{
            background: 'white',
            boxShadow: theme.shadows[3],
            borderRadius: 2,
            p: 2
          }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: theme.palette.grey[800] }}>
                Bot Metrics Over Time
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: '#3b82f6'
                  }}
                >
                  ● Active Bots
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: '#10b981'
                  }}
                >
                  ● Success Rate
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: '#f59e0b'
                  }}
                >
                  ● Avg Execution Time
                </Typography>
              </Box>
              {formatChartData(overview).every(d => d.noData) ? (
                <Box 
                  sx={{ 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    No data available for the selected filters
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Try adjusting your filters or date range
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available date range: Dec 31, 2022 - Feb 19, 2023
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={formatChartData(overview)}>
                    <defs>
                      <linearGradient id="colorRunning" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorExecution" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: theme.palette.grey[800] }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis yAxisId="left" tick={{ fill: theme.palette.grey[800] }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: theme.palette.grey[800] }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Success Rate') return `${value.toFixed(1)}%`;
                        if (name === 'Avg Execution Time') return `${value.toFixed(2)}s`;
                        return value;
                      }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="running" 
                      name="Active Bots"
                      stroke="#3b82f6" 
                      fillOpacity={1}
                      fill="url(#colorRunning)" 
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="success_rate" 
                      name="Success Rate"
                      stroke="#10b981" 
                      fillOpacity={1}
                      fill="url(#colorSuccess)" 
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="execution_time" 
                      name="Avg Execution Time"
                      stroke="#f59e0b" 
                      fillOpacity={1}
                      fill="url(#colorExecution)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
