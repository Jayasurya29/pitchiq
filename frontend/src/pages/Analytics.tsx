import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/Card'
import { Loader2, TrendingUp, CheckCircle, Target, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'

interface HistoryRecord {
  id: number
  contact_name: string
  contact_title: string
  hotel_name: string
  hotel_location: string
  fit_score: number
  email_subject: string
  approval_status: string
  created_at: string
}

export default function Analytics() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/history')
        setRecords(data)
      } catch {
        console.error('Failed')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-stone-500">
      <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
  )

  const total = records.length
  const approved = records.filter(r => r.approval_status === 'approved').length
  const rejected = records.filter(r => r.approval_status === 'rejected').length
  const pending = records.filter(r => r.approval_status === 'pending').length
  const avgScore = total ? Math.round(records.reduce((a, r) => a + r.fit_score, 0) / total) : 0
  const approvalRate = total ? Math.round((approved / total) * 100) : 0
  const hotLeads = records.filter(r => r.fit_score >= 90).length

  // Score trend over time
  const scoreTrend = records
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((r, i) => ({
      index: i + 1,
      score: r.fit_score,
      name: r.contact_name
    }))

  // Score distribution
  const scoreRanges = [
    { range: '90–100', count: records.filter(r => r.fit_score >= 90).length, color: '#16a34a' },
    { range: '80–89', count: records.filter(r => r.fit_score >= 80 && r.fit_score < 90).length, color: '#2563eb' },
    { range: '70–79', count: records.filter(r => r.fit_score >= 70 && r.fit_score < 80).length, color: '#d97706' },
    { range: '60–69', count: records.filter(r => r.fit_score >= 60 && r.fit_score < 70).length, color: '#ea580c' },
    { range: '<60', count: records.filter(r => r.fit_score < 60).length, color: '#dc2626' },
  ]

  // Status breakdown
  const statusData = [
    { name: 'Approved', value: approved, color: '#16a34a' },
    { name: 'Pending', value: pending, color: '#d97706' },
    { name: 'Rejected', value: rejected, color: '#dc2626' },
  ].filter(d => d.value > 0)

  // Activity last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const count = records.filter(r =>
      new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr
    ).length
    return { date: dateStr, count }
  })

  // Top hotels
  const hotelCounts = records.reduce((acc, r) => {
    acc[r.hotel_name] = (acc[r.hotel_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topHotels = Object.entries(hotelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // Top leads by score
  const topLeads = records
    .slice()
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 5)

  const statCards = [
    { label: 'Total researches', value: total, icon: Target, color: 'text-stone-900' },
    { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Avg fit score', value: avgScore, icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Hot leads (90+)', value: hotLeads, icon: Zap, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-stone-500">
          Performance overview across all researches.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-500">{stat.label}</p>
                <Icon size={14} className={stat.color} />
              </div>
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
              {i === 2 && (
                <p className="text-xs text-stone-400 mt-1">{approvalRate}% approval rate</p>
              )}
            </Card>
          )
        })}
      </div>

      {/* Activity + Status */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardBody>
            <p className="text-sm font-medium text-stone-900 mb-4">Activity — last 7 days</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last7Days} barSize={20}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 12 }} cursor={{ fill: '#f5f5f4' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Researches" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm font-medium text-stone-900 mb-4">Status breakdown</p>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {statusData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-stone-500">{d.name}</span>
                      </div>
                      <span className="text-xs font-medium text-stone-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-center pt-8 text-stone-400">No data yet</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Score trend + Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-stone-900 mb-4">Score trend</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm font-medium text-stone-900 mb-4">Score distribution</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={scoreRanges} barSize={32}>
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 12 }} cursor={{ fill: '#f5f5f4' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Contacts">
                  {scoreRanges.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Top leads + Top hotels */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top leads */}
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-stone-900 mb-4">Top leads by score</p>
            <div className="space-y-2">
              {topLeads.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                    <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-[10px] font-semibold text-stone-600">
                      {r.contact_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-900">{r.contact_name}</p>
                      <p className="text-[10px] text-stone-400">{r.hotel_name}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${r.fit_score >= 90 ? 'text-green-600' : r.fit_score >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {r.fit_score}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Top hotels */}
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-stone-900 mb-4">Most researched hotels</p>
            <div className="space-y-3">
              {topHotels.map((h, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-stone-700 truncate">{h.name}</p>
                    <span className="text-xs text-stone-400 ml-2">{h.count}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${(h.count / (topHotels[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}