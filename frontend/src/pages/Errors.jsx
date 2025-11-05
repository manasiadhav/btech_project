import React, {useEffect, useState} from 'react'
import { getErrors } from '../api'
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'

export default function Errors(){
  const [data, setData] = useState(null)
  const [selectedUser, setSelectedUser] = useState('')
  
  const fetchData = async (user) => {
    try {
      const params = new URLSearchParams()
      if (user) params.append('user', user)
      console.log('Fetching data for user:', user);  // Debug log
      const response = await getErrors(params)
      console.log('Received response:', response);  // Debug log
      setData(response)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData(selectedUser)
  }, [selectedUser])

  if(!data) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{
          mb: 3,
          background: 'linear-gradient(45deg, #991b1b 30%, #ef4444 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}
      >
        Errors & Logs
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
          <InputLabel id="user-select-label">Filter by User</InputLabel>
          <Select
            labelId="user-select-label"
            value={selectedUser}
            label="Filter by User"
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <MenuItem value="">All Users</MenuItem>
            {data?.users?.map((user) => (
              <MenuItem key={user} value={user}>{user}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)', color: 'white' }}>
        <Typography variant="h6" gutterBottom>Failure by Status</Typography>
        <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)' }}>
          <Typography variant="body1" component="pre" sx={{ color: 'white', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(data.failure_by_status, null, 2)}
          </Typography>
        </Paper>
      </Paper>

      <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)', color: 'white' }}>
        <Typography variant="h6" gutterBottom>Recent Runs</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Bot</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Last Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Failure Count</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Last Run</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recent.map((r,i)=> (
                <TableRow key={i} sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                  <TableCell sx={{ color: 'white' }}>{r['Bot Name']}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{r['Last Status']}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{r['Failure Count']}</TableCell>
                  <TableCell sx={{ color: 'white' }}>{r['Last Run Timestamp']}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
