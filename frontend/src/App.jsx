
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, Box } from '@mui/material'
import { Dashboard as DashboardIcon } from '@mui/icons-material'
import { Assessment as AssessmentIcon } from '@mui/icons-material'
import { Error as ErrorIcon } from '@mui/icons-material'
import { Insights as InsightsIcon } from '@mui/icons-material'
import { Notifications as NotificationsIcon } from '@mui/icons-material'
import { Summarize as SummarizeIcon } from '@mui/icons-material'
import { Analytics as AnalyticsIcon } from '@mui/icons-material'
import { Link, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import Overview from './pages/Overview'
import Performance from './pages/Performance'
import Errors from './pages/Errors'
import Alerts from './pages/Alerts'
import Summary from './pages/Summary'
import Analytics from './pages/Analytics'

const navItems = [
  {text:'Overview', icon:<DashboardIcon/>, path:'/'},
  {text:'Performance', icon:<AssessmentIcon/>, path:'/performance'},
  {text:'Errors & Logs', icon:<ErrorIcon/>, path:'/errors'},
  {text:'Analytics', icon:<AnalyticsIcon/>, path:'/analytics'},
  {text:'Alerts', icon:<NotificationsIcon/>, path:'/alerts'},
  {text:'Summary', icon:<SummarizeIcon/>, path:'/summary'}
]

function Sidebar(){
  const location = useLocation()
  return (
    <Drawer variant="permanent" sx={{width:220, flexShrink:0,
      [`& .MuiDrawer-paper`]: {width:220, boxSizing:'border-box', bgcolor:'#1f2937', color:'white'}
    }}>
      <Toolbar>
        <Typography variant="h6" noWrap>Bot Monitor</Typography>
      </Toolbar>
      <List>
        {navItems.map(item => (
          <ListItem button key={item.text} component={Link} to={item.path} selected={location.pathname===item.path} sx={{color:'white'}}>
            <ListItemIcon sx={{color:'white'}}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  )
}

export default function App(){
  return (
    <Box sx={{display:'flex', height:'100vh'}}>
      <Sidebar />
      <Box component="main" sx={{flex:1, bgcolor:'#f3f4f6', p:3, overflow:'auto'}}>
        <Routes>
          <Route path="/" element={<Overview/>} />
          <Route path="/performance" element={<Performance/>} />
          <Route path="/errors" element={<Errors/>} />
          <Route path="/analytics" element={<Analytics/>} />
          <Route path="/alerts" element={<Alerts/>} />
          <Route path="/summary" element={<Summary/>} />
        </Routes>
      </Box>
    </Box>
  )
}
