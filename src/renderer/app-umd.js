// This is a UMD-compatible version of the React app initialization
(function() {
  // Wait for the DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Get React and ReactDOM from the global scope (loaded via script tags)
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const ReactRouterDOM = window.ReactRouterDOM;
    
    // Destructure needed components from React Router
    const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM;
    
    // Simple Login component
    function Login() {
      const [username, setUsername] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [role, setRole] = React.useState('dev');
      const [error, setError] = React.useState('');
      const [isLoading, setIsLoading] = React.useState(false);
      
      const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!username || !password) {
          setError('Please enter both username and password');
          return;
        }
        
        setIsLoading(true);
        setError('');
        
        // Simulate API call with a timeout
        setTimeout(() => {
          // Navigate to dashboard based on role
          window.location.hash = role === 'dev' ? '#/dashboard/dev' : '#/dashboard/office';
          setIsLoading(false);
        }, 1000);
      };
      
      return React.createElement('div', { className: 'login-container' },
        React.createElement('div', { className: 'login-form-container' },
          React.createElement('h1', null, 'TICKING-RMA'),
          React.createElement('h2', null, 'Login'),
          
          error && React.createElement('div', { className: 'error-message' }, error),
          
          React.createElement('form', { onSubmit: handleSubmit, className: 'login-form' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { htmlFor: 'username' }, 'Username'),
              React.createElement('input', {
                type: 'text',
                id: 'username',
                value: username,
                onChange: (e) => setUsername(e.target.value),
                placeholder: 'Enter your username',
                disabled: isLoading
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { htmlFor: 'password' }, 'Password'),
              React.createElement('input', {
                type: 'password',
                id: 'password',
                value: password,
                onChange: (e) => setPassword(e.target.value),
                placeholder: 'Enter your password',
                disabled: isLoading
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { htmlFor: 'role' }, 'Role'),
              React.createElement('select', {
                id: 'role',
                value: role,
                onChange: (e) => setRole(e.target.value),
                disabled: isLoading
              },
                React.createElement('option', { value: 'dev' }, 'Developer'),
                React.createElement('option', { value: 'office' }, 'Office')
              )
            ),
            
            React.createElement('button', { 
              type: 'submit', 
              className: 'login-button', 
              disabled: isLoading 
            }, 
              isLoading ? [
                React.createElement('span', { className: 'spinner' }),
                'Logging in...'
              ] : 'Login'
            )
          )
        )
      );
    }
    
    // Simple Dashboard component
    function Dashboard() {
      return React.createElement('div', { className: 'dashboard-container' },
        React.createElement('h1', null, 'Welcome to TICKING-RMA Dashboard'),
        React.createElement('p', null, 'Your tasks and projects will appear here.')
      );
    }
    
    // App component
    function App() {
      return React.createElement(HashRouter, null,
        React.createElement(Routes, null,
          React.createElement(Route, { 
            path: '/login', 
            element: React.createElement(Login)
          }),
          React.createElement(Route, { 
            path: '/dashboard/*', 
            element: React.createElement(Dashboard)
          }),
          React.createElement(Route, { 
            path: '/', 
            element: React.createElement(Navigate, { to: '/login' })
          })
        )
      );
    }
    
    // Initialize the React app
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));
  });
})();
