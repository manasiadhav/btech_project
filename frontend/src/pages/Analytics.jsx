import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { getAnalytics } from '../api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from '../api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function TabPanel({ children, value, index }) {
  return value === index ? children : null;
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRiskUser, setSelectedRiskUser] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const analyticsData = await getAnalytics();
        // Transform the data to match the expected format
        const transformedData = {
          summary: {
            total_runs: analyticsData.total_runs || 0,
            success_rate: analyticsData.success_rate || 0,
            avg_exec_time: analyticsData.avg_execution_time || 0,
            error_count: analyticsData.total_errors || 0
          },
          status_distribution: analyticsData.status_distribution || {},
          daily_trends: analyticsData.daily_trends || { 'Run Count': {}, 'Success Rate (%)': {} },
          owner_insights: analyticsData.owner_insights || { 'Bot Name': {}, 'Success Rate (%)': {} },
          risk_analysis: {
            high_risk_bots: analyticsData.risk_analysis || []
          },
          users: analyticsData.users || [],
          userBots: analyticsData.userBots || {}
        };
        setData(transformedData);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!data) return null;

  const { summary, status_distribution, daily_trends, owner_insights, risk_analysis } = data;

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
        Analytics Dashboard
      </Typography>

      <Box sx={{ mb: 4 }}>
        <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
          <InputLabel>Select User</InputLabel>
          <Select
            value={selectedUser}
            label="Select User"
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <MenuItem value="">All Users</MenuItem>
            {data?.users?.map((user) => (
              <MenuItem key={user} value={user}>{user}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedUser && (
        <Paper sx={{ p: 3, mb: 4, background: '#f8fafc' }}>
          <Typography variant="h6" gutterBottom>Bots for {selectedUser}</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bot Name</TableCell>
                  <TableCell align="right">Total Runs</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                  <TableCell align="right">Avg Execution Time</TableCell>
                  <TableCell align="right">Errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.userBots?.[selectedUser]?.map((bot) => (
                  <TableRow key={bot.name}>
                    <TableCell>{bot.name}</TableCell>
                    <TableCell align="right">{bot.total_runs}</TableCell>
                    <TableCell align="right">{bot.success_rate.toFixed(1)}%</TableCell>
                    <TableCell align="right">{bot.avg_exec_time.toFixed(2)}s</TableCell>
                    <TableCell align="right">{bot.error_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Total Runs</Typography>
              <Typography variant="h3">{summary.total_runs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Success Rate</Typography>
              <Typography variant="h3">{summary.success_rate.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Avg Execution</Typography>
              <Typography variant="h3">{summary.avg_exec_time.toFixed(2)}s</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Errors</Typography>
              <Typography variant="h3">{summary.error_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} centered>
          <Tab label="Performance" />
          <Tab label="Status" />
          <Tab label="Risk Analysis" />
          <Tab label="Owner Insights" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>Daily Performance Trends</Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer>
                <AreaChart data={Object.entries(daily_trends['Run Count']).map(([day, count]) => ({
                  day,
                  count,
                  success_rate: daily_trends['Success Rate (%)'][day]
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area yAxisId="left" type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" name="Run Count" />
                  <Area yAxisId="right" type="monotone" dataKey="success_rate" stroke="#82ca9d" fill="#82ca9d" name="Success Rate %" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>Status Distribution</Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={Object.entries(status_distribution).map(([status, count]) => ({
                  status,
                  count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 3 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Filter by User</InputLabel>
                <Select
                  value={selectedRiskUser}
                  label="Filter by User"
                  onChange={(e) => setSelectedRiskUser(e.target.value)}
                >
                  <MenuItem value="">All Users</MenuItem>
                  {data?.users?.map((user) => (
                    <MenuItem key={user} value={user}>{user}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Risk Analysis - {selectedRiskUser || 'All'} Bots
            </Typography>
            
            <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
              <TableContainer component={Paper}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bot Name</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Risk Probability</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {risk_analysis.high_risk_bots
                      .filter(bot => !selectedRiskUser || bot.Owner.toLowerCase() === selectedRiskUser.toLowerCase())
                      .map((bot, index) => (
                        <TableRow 
                          key={index} 
                          sx={{ 
                            backgroundColor: bot.Risk_Prob >= 0.8 
                              ? '#fee2e2' 
                              : bot.Risk_Prob >= 0.5 
                                ? '#fff3cd'
                                : 'inherit',
                            '&:hover': {
                              backgroundColor: '#f1f5f9'
                            }
                          }}
                        >
                          <TableCell>{bot["Bot Name"]}</TableCell>
                          <TableCell>{bot.Owner}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ 
                                flexGrow: 1, 
                                backgroundColor: '#e2e8f0',
                                height: '10px',
                                borderRadius: '5px',
                                mr: 1
                              }}>
                                <Box 
                                  sx={{ 
                                    width: `${bot.Risk_Prob * 100}%`,
                                    height: '100%',
                                    backgroundColor: bot.Risk_Prob >= 0.7 ? '#ef4444' : bot.Risk_Prob >= 0.4 ? '#f59e0b' : '#22c55e',
                                    borderRadius: '5px'
                                  }}
                                />
                              </Box>
                              {(bot.Risk_Prob * 100).toFixed(1)}%
                            </Box>
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>Owner Performance</Typography>
            <Box sx={{ height: 500 }}>
              <ResponsiveContainer>
                <BarChart 
                  data={Object.entries(owner_insights['Bot Name']).map(([owner, count]) => ({
                    owner,
                    bots: count,
                    success_rate: owner_insights['Success Rate (%)'][owner]
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="owner" 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis yAxisId="left" label={{ value: 'Number of Bots', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Success Rate (%)', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="bots" fill="#8884d8" name="Bot Count">
                    {Object.entries(owner_insights['Bot Name']).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / Object.keys(owner_insights['Bot Name']).length}, 70%, 60%)`} />
                    ))}
                  </Bar>
                  <Bar yAxisId="right" dataKey="success_rate" fill="#82ca9d" name="Success Rate">
                    {Object.entries(owner_insights['Bot Name']).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / Object.keys(owner_insights['Bot Name']).length}, 50%, 70%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </TabPanel>
        </Box>
      </Paper>

      {/* ML Metrics */}
      {data.ml_metrics && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>ML Model Performance</Typography>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Typography variant="body1">Accuracy: {(data.ml_metrics.accuracy * 100).toFixed(1)}%</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body1">AUC: {(data.ml_metrics.auc * 100).toFixed(1)}%</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}