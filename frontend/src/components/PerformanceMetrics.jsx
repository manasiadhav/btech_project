import React from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const PerformanceMetrics = ({ data }) => {
  // Ensure values are properly bounded
  const failureRate = Math.min(100, data.failure_rate || 0);
  const riskScore = Math.min(100, data.risk_score || 0);
  const successRate = Math.min(100, 100 - failureRate);
  
  const chartData = [
    { name: 'Failure Rate', value: failureRate, color: '#ef4444' },
    { name: 'Risk Score', value: riskScore, color: '#f59e0b' },
    { name: 'Success Rate', value: successRate, color: '#10b981' }
  ];

  return (
    <Paper sx={{ p: 3, height: '100%', minHeight: 400, bgcolor: '#f8fafc' }}>
      <Typography variant="h6" gutterBottom>
        Performance Metrics
      </Typography>
      
      <Box sx={{ width: '100%', height: 300, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            background={{ fill: '#ffffff' }}
          >
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
              tick={{ fill: '#000000', fontSize: 14, fontWeight: 500 }}
              tickLine={{ stroke: '#000000', strokeWidth: 1 }}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
            />
            <YAxis 
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: '#000000', fontSize: 14, fontWeight: 500 }}
              tickLine={{ stroke: '#000000', strokeWidth: 1 }}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
              tickCount={6}
              label={{ 
                value: 'Percentage (%)', 
                angle: -90, 
                position: 'insideLeft',
                offset: -10,
                style: { fill: '#000000', fontSize: 16, fontWeight: 'bold' }
              }}
              grid={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            />
            <Tooltip 
              formatter={(value) => `${value.toFixed(1)}%`}
              labelStyle={{ color: '#000000', fontWeight: 'bold', fontSize: 14 }}
              contentStyle={{ 
                backgroundColor: '#ffffff',
                border: '2px solid #000000',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: 14
              }}
            />
            <Bar 
              dataKey="value"
              maxBarSize={60}
              label={{
                position: 'top',
                fill: '#000000',
                fontSize: 14,
                fontWeight: 'bold',
                formatter: (value) => `${value.toFixed(1)}%`
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PerformanceMetrics;