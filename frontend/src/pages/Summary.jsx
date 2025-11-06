// ML libs (client-side)
import { RandomForestClassifier as RFClassifier } from 'ml-random-forest';
import IsolationForest from 'isolation-forest';
import React, { useEffect, useMemo, useState } from 'react';
import { getSummary, getDataset } from '../api';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// Utility function to format status name for display
const formatStatus = (status) => {
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Summary = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState('');
  const [error, setError] = useState(null);
  const [botAnalysis, setBotAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState('all');

  // ML state
  const [datasetRows, setDatasetRows] = useState([]);
  const [mlLoading, setMlLoading] = useState(true);
  const [mlError, setMlError] = useState(null);
  const [enrichedByBot, setEnrichedByBot] = useState({});

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        console.log('Summary: Fetching data for user:', selectedUser);
        
        const params = new URLSearchParams();
        if (selectedUser !== 'all') {
          params.append('user', selectedUser);
        }
        
        const data = await getSummary(params);
        console.log('Summary: Received data:', data);
        
        if (!data?.summary) {
          throw new Error('Invalid data structure from API');
        }
        
        // Reset bot selection when user changes
        setSelectedBot('');
        setBotAnalysis(null);
        
        setSummaryData(data);
      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch summary data';
        console.error('Error in Summary component:', errorMessage, err);
        setError(errorMessage);
        setSummaryData(null); // Clear invalid data
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [selectedUser]);

  // Fetch dataset and train client-side ML (RF + IF)
  useEffect(() => {
    const runML = async () => {
      setMlLoading(true);
      setMlError(null);
      try {
        const ds = await getDataset();
        const rows = Array.isArray(ds?.rows) ? ds.rows : [];
        setDatasetRows(rows);

        // Build features
        const X = [];
        const y = [];
        const names = [];
        for (const r of rows) {
          const runCount = Number(r['Run Count'] || 0);
          const failureCount = Number(r['Failure Count'] || 0);
          const successRate = Number(r['Success Rate (%)'] || 0);
          const avgExec = Number(r['Average Execution Time (s)'] || 0);
          const failureRate = runCount > 0 ? (failureCount / Math.max(1, runCount)) * 100 : 0;
          X.push([runCount, failureCount, successRate, avgExec]);
          y.push(failureRate > 20 ? 1 : 0);
          names.push(String(r['Bot Name']));
        }

        // Train RandomForest classifier (votes -> probability)
        let rfProb = new Array(X.length).fill(0.0);
        try {
          if (X.length > 0) {
            const rf = new RFClassifier({
              nEstimators: 200,
              maxFeatures: 0.8,
              seed: 42,
              replacement: true,
              useSampleBagging: true
            });
            rf.train(X, y);
            // Approx probability via tree votes if available; fallback to predict labels
            if (Array.isArray(rf.estimators_) && rf.estimators_.length) {
              const trees = rf.estimators_;
              const votes = new Array(X.length).fill(0);
              for (const t of trees) {
                const preds = t.predict(X);
                preds.forEach((p, i) => { votes[i] += (p === 1 ? 1 : 0); });
              }
              rfProb = votes.map(v => v / trees.length);
            } else {
              const preds = rf.predict(X);
              rfProb = preds.map(p => (p === 1 ? 0.7 : 0.3));
            }
          }
        } catch (e) {
          console.warn('RF training failed, falling back to heuristic risk:', e);
          rfProb = X.map(v => {
            const [runCount, failureCount, successRate, avgExec] = v;
            const failureRate = runCount > 0 ? failureCount / Math.max(1, runCount) : 0;
            const successImpact = (100 - successRate) / 100;
            const execImpact = avgExec > 0 ? Math.min(1, avgExec / (2 * (avgExec || 1))) : 0;
            return Math.max(0, Math.min(1, 0.5 * failureRate + 0.4 * successImpact + 0.1 * execImpact));
          });
        }

        // Isolation Forest for anomaly detection on numeric signals
        let anomalyScore = new Array(X.length).fill(0);
        let isAnomaly = new Array(X.length).fill(false);
        try {
          if (X.length > 0) {
            const iso = new IsolationForest({ nTrees: 200, sampleSize: Math.min(256, X.length), seed: 42 });
            iso.fit(X);
            const scores = iso.scores(); // higher = more anomalous
            const threshold = 0.6; // conservative default
            anomalyScore = scores;
            isAnomaly = scores.map(s => s >= threshold);
          }
        } catch (e) {
          console.warn('IsolationForest failed, defaulting to non-anomalous:', e);
        }

        // Build enriched map by bot name
        const enriched = {};
        rows.forEach((r, i) => {
          const runCount = Number(r['Run Count'] || 0);
          const failureCount = Number(r['Failure Count'] || 0);
          const successRate = Number(r['Success Rate (%)'] || 0);
          const failureRatePct = runCount > 0 ? (failureCount / Math.max(1, runCount)) * 100 : 0;
          enriched[String(r['Bot Name'])] = {
            name: String(r['Bot Name']),
            owner: String(r['Owner'] || ''),
            risk_probability: rfProb[i] || 0,
            anomaly_score: anomalyScore[i] || 0,
            is_anomalous: !!isAnomaly[i],
            success_rate: successRate || 0,
            failure_rate: failureRatePct || 0,
            recent_failures: failureCount || 0,
            recent_runs: runCount || 0
          };
        });

        setEnrichedByBot(enriched);
      } catch (e) {
        setMlError(e?.message || 'Failed to run client-side ML');
      } finally {
        setMlLoading(false);
      }
    };
    runML();
  }, []);

  // When bot changes, derive analysis from enriched map (client-side ML)
  useEffect(() => {
    if (!selectedBot) return;
    setAnalysisLoading(true);
    const r = enrichedByBot[selectedBot];
    if (r) {
      setBotAnalysis({
        risk_probability: r.risk_probability,
        failure_rate: r.failure_rate,
        recent_failures: r.recent_failures,
        recent_runs: r.recent_runs,
        success_rate: r.success_rate,
        is_anomalous: r.is_anomalous,
        anomaly_score: r.anomaly_score,
        recommendations: [
          'Investigate recent error logs and failure patterns',
          'Schedule immediate maintenance and monitoring',
          'Optimize execution time if consistently high'
        ]
      });
    }
    setAnalysisLoading(false);
  }, [selectedBot, enrichedByBot]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh" gap={2}>
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Check the browser console for more details
        </Typography>
      </Box>
    );
  }

  console.log('Rendering Summary with data:', summaryData);

  // Build risk-based dropdown groups from ML if available, else show basic list
  const groupedOptions = useMemo(() => {
    const bots = Object.values(enrichedByBot);
    const high = bots.filter(b => b.risk_probability >= 0.8).map(b => b.name);
    const med = bots.filter(b => b.risk_probability >= 0.5 && b.risk_probability < 0.8).map(b => b.name);
    const low = bots.filter(b => b.risk_probability < 0.5).map(b => b.name);
    return { high, med, low };
  }, [enrichedByBot]);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom color="primary">
        Summary Analytics
      </Typography>

      {/* User Filter */}
      <Box mb={4}>
        <FormControl fullWidth variant="outlined">
          <InputLabel>Select User</InputLabel>
          <Select
            value={selectedUser}
            label="Select User"
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <MenuItem value="all">All Users</MenuItem>
            {Array.from({ length: 20 }, (_, i) => (
              <MenuItem key={i + 1} value={`user${i + 1}`}>{`user${i + 1}`}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Overall Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, bgcolor: '#2563eb', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Total Runs</Typography>
            <Typography variant="h3">{summaryData?.summary?.total_runs || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, bgcolor: '#dc2626', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Total Failures</Typography>
            <Typography variant="h3">{summaryData?.summary?.total_failures || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, bgcolor: '#059669', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Success Rate</Typography>
            <Typography variant="h3">{(summaryData?.summary?.global_success_rate || 0).toFixed(1)}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, bgcolor: '#ea580c', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Critical Bots</Typography>
            <Typography variant="h3">{summaryData?.summary?.bots_with_critical_priority || 0}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* AI Failure Analysis Report */}
      <Paper sx={{ p: 3, bgcolor: '#1e40af', color: 'white', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          AI Failure Analysis Report
        </Typography>
        
        <Typography variant="body1" gutterBottom sx={{ opacity: 0.8 }}>
          Select a bot from the dropdown below to generate an AI-powered failure analysis report
        </Typography>

        <FormControl fullWidth variant="outlined" sx={{ mt: 3, mb: 4 }}>
          <InputLabel sx={{ color: 'white' }}>Choose Bot</InputLabel>
          <Select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            sx={{
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.6)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
            }}
          >
            {/* Group bots by ML risk level (client-side) */}
            <MenuItem value="" disabled>HIGH RISK BOTS</MenuItem>
            {groupedOptions.high.map((name) => (
              <MenuItem key={name} value={name} sx={{ color: '#ef4444' }}>{name}</MenuItem>
            ))}

            <MenuItem value="" disabled sx={{ mt: 1 }}>MEDIUM RISK BOTS</MenuItem>
            {groupedOptions.med.map((name) => (
              <MenuItem key={name} value={name} sx={{ color: '#f59e0b' }}>{name}</MenuItem>
            ))}

            <MenuItem value="" disabled sx={{ mt: 1 }}>LOW RISK BOTS</MenuItem>
            {groupedOptions.low.map((name) => (
              <MenuItem key={name} value={name} sx={{ color: '#10b981' }}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {analysisLoading || mlLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress color="inherit" />
          </Box>
        ) : botAnalysis ? (
          <>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ mb: 3 }}>
                <Alert 
                  severity={botAnalysis?.risk_probability > 0.7 ? 'error' : botAnalysis?.risk_probability > 0.3 ? 'warning' : 'info'}
                  sx={{ 
                    bgcolor: 'rgba(254, 243, 199, 0.1)', 
                    color: 'white',
                    border: '1px solid rgba(254, 243, 199, 0.2)',
                    '.MuiAlert-icon': { color: '#fbbf24' },
                    mb: 2
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="h6">
                      {botAnalysis?.risk_probability > 0.7 ? 'HIGH' : botAnalysis?.risk_probability > 0.3 ? 'MEDIUM' : 'LOW'} RISK
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography>
                        Risk Score: {(botAnalysis?.risk_probability * 100).toFixed(1)}%
                      </Typography>
                      <Box sx={{ 
                        flex: 1, 
                        height: '4px', 
                        bgcolor: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <Box sx={{ 
                          height: '100%', 
                          width: `${botAnalysis?.risk_probability * 100}%`,
                          bgcolor: botAnalysis?.risk_probability > 0.7 ? '#ef4444' : 
                                  botAnalysis?.risk_probability > 0.3 ? '#f59e0b' : '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </Box>
                    </Box>
                  </Box>
                </Alert>
                {botAnalysis?.is_anomalous && botAnalysis?.anomaly_score !== undefined && (
                  <Alert 
                    severity="warning"
                    sx={{ 
                      bgcolor: 'rgba(239, 68, 68, 0.1)', 
                      color: 'white',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      '.MuiAlert-icon': { color: '#ef4444' }
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="h6">
                        ANOMALOUS BEHAVIOR DETECTED
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography>
                          Anomaly Score: {Number(botAnalysis.anomaly_score).toFixed(3)}
                        </Typography>
                        <Box sx={{ 
                          flex: 1, 
                          height: '4px', 
                          bgcolor: 'rgba(255,255,255,0.1)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            height: '100%', 
                            width: `${botAnalysis.anomaly_score * 100}%`,
                            bgcolor: '#ef4444',
                            transition: 'width 0.3s ease'
                          }} />
                        </Box>
                      </Box>
                    </Box>
                  </Alert>
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>Key Contributing Factors:</Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                • {botAnalysis?.failure_rate > 70 ? 'High' : 'Moderate'} failure rate ({botAnalysis?.failure_rate.toFixed(1)}% of runs failed)<br />
                • {botAnalysis?.recent_failures > 30 ? 'High' : 'Moderate'} absolute failure count ({botAnalysis?.recent_failures} failures)
              </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>Recommendations:</Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                {botAnalysis?.recommendations.map((rec, index) => (
                  <React.Fragment key={index}>
                    • {rec}<br />
                  </React.Fragment>
                ))}
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>Performance Metrics:</Typography>
              <Box sx={{ 
                height: '300px', 
                bgcolor: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: 1,
                p: 4,
                position: 'relative'
              }}>
                {/* Y-axis label */}
                <Typography 
                  sx={{ 
                    position: 'absolute',
                    left: -40,
                    top: '50%',
                    transform: 'rotate(-90deg) translateX(50%)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem'
                  }}
                >
                  Percentage (%)
                </Typography>
                
                {/* Y-axis ticks */}
                <Box sx={{ position: 'absolute', left: 10, top: 0, bottom: 20, width: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {[100, 75, 50, 25, 0].map((tick) => (
                    <Typography key={tick} sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                      {tick}
                    </Typography>
                  ))}
                </Box>

                {/* Graph content */}
                <Box sx={{ 
                  display: 'flex', 
                  height: 'calc(100% - 30px)', // Leave space for labels
                  alignItems: 'flex-end', 
                  gap: 2,
                  pl: 4,
                  mb: 2 // Space for labels at bottom
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Box sx={{ 
                      width: '100%',
                      height: `${botAnalysis?.failure_rate || 0}%`,
                      minHeight: '2px', // Ensure bar is always visible
                      bgcolor: '#ef4444',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                      '&:hover': {
                        opacity: 0.8
                      },
                      '&::after': {
                        content: '"' + (botAnalysis?.failure_rate || 0).toFixed(1) + '%"',
                        position: 'absolute',
                        top: -25,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#fff',
                        fontSize: '0.75rem'
                      }
                    }} />
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem', textAlign: 'center', mt: 1 }}>
                      Failure Rate
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Box sx={{ 
                      width: '100%',
                      height: `${(botAnalysis?.risk_probability || 0) * 100}%`,
                      minHeight: '2px', // Ensure bar is always visible
                      bgcolor: '#f59e0b',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                      '&:hover': {
                        opacity: 0.8
                      },
                      '&::after': {
                        content: '"' + ((botAnalysis?.risk_probability || 0) * 100).toFixed(1) + '%"',
                        position: 'absolute',
                        top: -25,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#fff',
                        fontSize: '0.75rem'
                      }
                    }} />
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem', textAlign: 'center', mt: 1 }}>
                      Risk Score
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Box sx={{ 
                      width: '100%',
                      height: `${botAnalysis?.success_rate || 0}%`,
                      minHeight: '2px', // Ensure bar is always visible
                      bgcolor: '#10b981',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                      '&:hover': {
                        opacity: 0.8
                      },
                      '&::after': {
                        content: '"' + (botAnalysis?.success_rate || 0).toFixed(1) + '%"',
                        position: 'absolute',
                        top: -25,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#fff',
                        fontSize: '0.75rem'
                      }
                    }} />
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem', textAlign: 'center' }}>
                      Success Rate
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </>
        ) : (
          <Typography>Select a bot to view analysis</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default Summary;
