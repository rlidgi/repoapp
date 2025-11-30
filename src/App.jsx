import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Pricing from './pages/Pricing';
import { createPageUrl } from '@/utils';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path={createPageUrl('Home')} element={<Home />} />
          <Route path={createPageUrl('Gallery')} element={<Gallery />} />
          <Route path={createPageUrl('Pricing')} element={<Pricing />} />
          <Route
            path="*"
            element={<Navigate to={createPageUrl('Home')} replace />}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
