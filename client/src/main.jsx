import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router'
import { Provider } from 'react-redux';
import store from './store/store.js'


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
     
        <main>{children}</main>
        
      </body>
    </html>
  )
}


createRoot(document.getElementById('root')).render(
  

  <BrowserRouter>
<Provider store={store}>
<App />

</Provider>
  
  </BrowserRouter>

   
  
)
