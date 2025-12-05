import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Admin from './pages/Admin';
import GalleryViewer from './pages/GalleryViewer';
import { createPageUrl } from '@/utils';
import ScrollToTop from './ScrollToTop';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path={createPageUrl('Home')} element={<Home />} />
          <Route path={createPageUrl('Gallery')} element={<Gallery />} />
          <Route path="/gallery/viewer" element={<GalleryViewer />} />
          <Route path={createPageUrl('Pricing')} element={<Pricing />} />
          <Route path={createPageUrl('Privacy')} element={<Privacy />} />
          <Route path={createPageUrl('Terms')} element={<Terms />} />
          <Route path={createPageUrl('Admin')} element={<Admin />} />
          <Route
            path="*"
            element={<Navigate to={createPageUrl('Home')} replace />}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
