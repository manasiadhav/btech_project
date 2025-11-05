import React, {useEffect, useState} from 'react'
import { getAlerts } from '../api'
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Chip,
  CircularProgress,
  LinearProgress
} from '@mui/material'
import { 
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Bolt as AnomalyIcon
} from '@mui/icons-material'

export default function Alerts(){
  const [data, setData] = useState(null)
  useEffect(()=>{ let m=true; getAlerts().then(d=> m && setData(d.alerts)).catch(()=>{}); return ()=>m=false },[])
  if(!data) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );

  const getSeverityColor = (severity) => {
    switch(severity.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#10b981';
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity.toLowerCase()) {
      case 'critical': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{
          mb: 3,
          background: 'linear-gradient(45deg, #dc2626 30%, #f97316 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}
      >
        Top 20 High-Risk & Anomalous Bots
      </Typography>

      <Paper sx={{ 
        p: 3, 
        background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
        color: 'white'
      }}>
        <List>
          {data.map((alert, index) => (
            <ListItem
              key={index}
              sx={{
                mb: 2,
                bgcolor: 'rgba(255,255,255,0.1)',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.15)'
                }
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h6" component="span">
                      {alert.bot_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        icon={getSeverityIcon(alert.severity)}
                        label={alert.alert_type}
                        sx={{
                          bgcolor: getSeverityColor(alert.severity),
                          color: 'white',
                          '& .MuiChip-icon': {
                            color: 'white'
                          }
                        }}
                      />
                      {alert.is_anomaly && (
                        <Chip
                          icon={<AnomalyIcon />}
                          label="Anomalous"
                          sx={{
                            bgcolor: '#9333ea',
                            color: 'white',
                            '& .MuiChip-icon': {
                              color: 'white'
                            }
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Box sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 4, mb: 1, flexWrap: 'wrap' }}>
                      <Typography component="span">
                        Risk Score: {alert.risk_score}%
                      </Typography>
                      <Typography component="span">
                        Success Rate: {alert.success_rate}%
                      </Typography>
                      <Typography component="span">
                        Failures: {alert.failure_count}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={alert.risk_score} 
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getSeverityColor(alert.severity)
                            }
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  )
}
