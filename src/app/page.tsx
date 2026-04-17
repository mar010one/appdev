import { getStats } from "@/lib/actions";
import { Users, Smartphone, History, Plus, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="container animate-in">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p className="text-muted">Welcome back. Here is what is happening with your client apps.</p>
        </div>
        <Link href="/accounts" className="btn btn-primary">
          <Plus size={18} />
          <span>New Account</span>
        </Link>
      </header>

      <section className="stat-group">
        <div className="glass-card stat-card">
          <div className="stat-icon purple" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Users size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Clients</span>
            <span className="stat-value">{stats.accounts}</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon blue" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Smartphone size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Apps</span>
            <span className="stat-value">{stats.apps}</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon gold" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
            <ShieldCheck size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Releases</span>
            <span className="stat-value">{stats.versions}</span>
          </div>
        </div>
      </section>

      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <div className="glass-card action-item">
            <div className="action-header">
              <Globe size={20} className="gold" />
              <h3>Google Play Management</h3>
            </div>
            <p>Add and track Google Play developer accounts for your clients.</p>
            <Link href="/accounts" className="btn btn-secondary">Manage</Link>
          </div>

          <div className="glass-card action-item">
            <div className="action-header">
              <Smartphone size={20} className="gold" />
              <h3>App Store Connection</h3>
            </div>
            <p>Monitor Apple developer accounts and app deployment status.</p>
            <Link href="/accounts" className="btn btn-secondary">Manage</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
