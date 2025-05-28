import React from 'react';

const Layout = ({ children }) => {
  return (
    <div>
      <header>
        <h1>Sailing Event</h1>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; {new Date().getFullYear()} Sailing Event</p>
      </footer>
    </div>
  );
};

export default Layout;