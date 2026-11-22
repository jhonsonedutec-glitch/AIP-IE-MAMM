import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 print:h-auto print:w-auto print:overflow-visible print:bg-white">
      <div className="no-print shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 print:block print:w-full">
        <div className="no-print">
          <Header />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible print:block print:w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
