import { useEffect, useMemo, useState } from "react";

import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, TrendingUp, DollarSign, Users, Phone, MapPin, CreditCard, Eye, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";

type RangeOrder = { created_at: string; total_amount: number };
type ChartBucket = { key: string; dateKey: string; revenue: number; orders: number };

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    phoneNumbers: 0,
    shopLocations: 0,
    paymentMethods: 0,
    recentOrders: [] as any[],
    lowStockProducts: [] as any[],
    todayRevenue: 0,
    weekRevenue: 0,
  });
  const [range, setRange] = useState<"7d" | "30d" | "custom">("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [rangeOrders, setRangeOrders] = useState<RangeOrder[]>([]);
  const [prevRangeOrders, setPrevRangeOrders] = useState<RangeOrder[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchRangeData();
  }, [range, customStart, customEnd]);

  const fetchStats = async () => {
    try {
      // Get total products
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Get total orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      // Get pending orders
      const { count: pendingCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get total revenue
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "delivered");

      const revenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Get total users
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get phone numbers count
      const { count: phoneCount } = await (supabase as any)
        .from("phone_numbers")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get shop locations count
      const { count: locationsCount } = await (supabase as any)
        .from("shop_locations")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get payment methods count
      const { count: paymentMethodsCount } = await (supabase as any)
        .from("payment_methods")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get recent orders
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      // Get low stock products
      const { data: lowStockProducts } = await supabase
        .from("products")
        .select("*")
        .lte("stock", 10)
        .eq("published", true)
        .order("stock", { ascending: true })
        .limit(5);

      // Get today's revenue
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "delivered")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      const todayRevenue = todayOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Get this week's revenue
      const weekStart = startOfDay(subDays(today, 7));
      const weekEnd = endOfDay(today);
      
      const { data: weekOrders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "delivered")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      const weekRevenue = weekOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
        pendingOrders: pendingCount || 0,
        totalRevenue: revenue,
        totalUsers: usersCount || 0,
        phoneNumbers: phoneCount || 0,
        shopLocations: locationsCount || 0,
        paymentMethods: paymentMethodsCount || 0,
        recentOrders: recentOrders || [],
        lowStockProducts: lowStockProducts || [],
        todayRevenue,
        weekRevenue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getRange = () => {
    const now = new Date();
    if (range === "7d") return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    if (range === "30d") return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    const start = customStart ? startOfDay(new Date(customStart)) : startOfDay(subDays(now, 6));
    const end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
    return { start, end };
  };

  const getPrevRange = () => {
    const { start, end } = getRange();
    const diffMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(prevEnd.getTime() - diffMs);
    return { start: prevStart, end: prevEnd };
  };

  const fetchRangeData = async () => {
    setRangeLoading(true);
    setRangeError(null);
    try {
      const { start, end } = getRange();
      const { start: pStart, end: pEnd } = getPrevRange();

      const [curr, prev] = await Promise.all([
        supabase
          .from("orders")
          .select("created_at, total_amount, status")
          .eq("status", "delivered")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),
        supabase
          .from("orders")
          .select("created_at, total_amount, status")
          .eq("status", "delivered")
          .gte("created_at", pStart.toISOString())
          .lte("created_at", pEnd.toISOString()),
      ]);

      if (curr.error) throw curr.error;
      if (prev.error) throw prev.error;

      setRangeOrders((curr.data || []).map((o: any) => ({ created_at: o.created_at, total_amount: Number(o.total_amount) })));
      setPrevRangeOrders((prev.data || []).map((o: any) => ({ created_at: o.created_at, total_amount: Number(o.total_amount) })));
    } catch (e: any) {
      console.error("Error fetching range data:", e);
      setRangeError("Failed to load range data");
      setRangeOrders([]);
      setPrevRangeOrders([]);
    } finally {
      setRangeLoading(false);
    }
  };

  const chartData = useMemo<{ series: ChartBucket[]; maxRevenue: number; maxOrders: number }>(() => {
    const { start, end } = getRange();
    const days = eachDayOfInterval({ start, end });
    const buckets: ChartBucket[] = days.map((d) => ({ key: format(d, "MMM d"), dateKey: format(d, "yyyy-MM-dd"), revenue: 0, orders: 0 }));
    const map = new Map<string, ChartBucket>(buckets.map((b) => [b.dateKey, b]));
    for (const o of rangeOrders) {
      const dk = format(new Date(o.created_at), "yyyy-MM-dd");
      const bucket = map.get(dk);
      if (bucket) {
        bucket.revenue += o.total_amount;
        bucket.orders += 1;
      }
    }
    const arr = Array.from(map.values());
    const maxRevenue = Math.max(1, ...arr.map((b) => b.revenue));
    const maxOrders = Math.max(1, ...arr.map((b) => b.orders));
    return { series: arr, maxRevenue, maxOrders };
  }, [rangeOrders, range, customStart, customEnd]);

  const currentTotals = useMemo(() => ({
    revenue: rangeOrders.reduce((s, o) => s + o.total_amount, 0),
    orders: rangeOrders.length,
  }), [rangeOrders]);

  const previousTotals = useMemo(() => ({
    revenue: prevRangeOrders.reduce((s, o) => s + o.total_amount, 0),
    orders: prevRangeOrders.length,
  }), [prevRangeOrders]);

  const deltas = useMemo(() => {
    const revDelta = previousTotals.revenue ? ((currentTotals.revenue - previousTotals.revenue) / previousTotals.revenue) * 100 : 100;
    const ordDelta = previousTotals.orders ? ((currentTotals.orders - previousTotals.orders) / previousTotals.orders) * 100 : 100;
    return { revDelta, ordDelta };
  }, [currentTotals, previousTotals]);

  const exportCsv = () => {
    const rows = [
      ["created_at", "total_amount"],
      ...rangeOrders.map((o) => [o.created_at, String(o.total_amount)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders_range.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-500",
      link: "/admin/products",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-green-500",
      link: "/admin/orders",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: TrendingUp,
      color: "text-orange-500",
      link: "/admin/orders",
    },
    {
      title: "Total Revenue",
      value: `${stats.totalRevenue.toLocaleString()} ETB`,
      icon: DollarSign,
      color: "text-purple-500",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-indigo-500",
    },
    {
      title: "Phone Numbers",
      value: stats.phoneNumbers,
      icon: Phone,
      color: "text-teal-500",
      link: "/admin/phone-numbers",
    },
    {
      title: "Shop Locations",
      value: stats.shopLocations,
      icon: MapPin,
      color: "text-red-500",
      link: "/admin/shop-locations",
    },
    {
      title: "Payment Methods",
      value: stats.paymentMethods,
      icon: CreditCard,
      color: "text-yellow-500",
      link: "/admin/payment-methods",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-display mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your store and business metrics</p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base">Revenue Over Time</CardTitle>
              <CardDescription>Delivered orders in selected range</CardDescription>
            </CardHeader>
            {rangeLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : rangeError ? (
              <div className="h-40 flex items-center justify-center text-sm text-red-600">{rangeError}</div>
            ) : (
              <div className="h-40 flex items-end gap-1">
                {chartData.series.map((d) => (
                  <div key={d.dateKey} className="flex-1 bg-purple-500/20" style={{ height: `${(d.revenue / chartData.maxRevenue) * 100}%` }} title={`${d.key}: ${d.revenue.toLocaleString()} ETB`} />
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{chartData.series[0]?.key}</span>
              <span>{chartData.series[chartData.series.length - 1]?.key}</span>
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base">Orders Over Time</CardTitle>
              <CardDescription>Delivered orders count</CardDescription>
            </CardHeader>
            {rangeLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : rangeError ? (
              <div className="h-40 flex items-center justify-center text-sm text-red-600">{rangeError}</div>
            ) : (
              <div className="h-40 flex items-end gap-1">
              {chartData.series.map((d) => (
                <div key={d.dateKey} className="flex-1 bg-blue-500/20" style={{ height: `${(d.orders / chartData.maxOrders) * 100}%` }} title={`${d.key}: ${d.orders} orders`} />
              ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{chartData.series[0]?.key}</span>
              <span>{chartData.series[chartData.series.length - 1]?.key}</span>
            </div>
          </Card>
        </div>

        {/* Revenue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Today's Revenue</h3>
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.todayRevenue.toLocaleString()} ETB</p>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">This Week's Revenue</h3>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.weekRevenue.toLocaleString()} ETB</p>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.totalRevenue.toLocaleString()} ETB</p>
          </Card>
        </div>

        {/* Range Controls */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <div className="flex gap-2">
              <Button variant={range === "7d" ? "default" : "outline"} size="sm" onClick={() => setRange("7d")}>7d</Button>
              <Button variant={range === "30d" ? "default" : "outline"} size="sm" onClick={() => setRange("30d")}>30d</Button>
              <Button variant={range === "custom" ? "default" : "outline"} size="sm" onClick={() => setRange("custom")}>Custom</Button>
            </div>
            {range === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                <span className="text-sm">to</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
            </div>
          </div>
        </Card>

        {/* Current vs Previous Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Range Revenue</h3>
              <span className={`text-xs px-2 py-1 rounded ${deltas.revDelta >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                {deltas.revDelta >= 0 ? "+" : ""}{deltas.revDelta.toFixed(1)}%
              </span>
            </div>
            <p className="text-2xl font-bold">{currentTotals.revenue.toLocaleString()} ETB</p>
            <p className="text-xs text-muted-foreground">Prev: {previousTotals.revenue.toLocaleString()} ETB</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Range Orders</h3>
              <span className={`text-xs px-2 py-1 rounded ${deltas.ordDelta >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                {deltas.ordDelta >= 0 ? "+" : ""}{deltas.ordDelta.toFixed(1)}%
              </span>
            </div>
            <p className="text-2xl font-bold">{currentTotals.orders}</p>
            <p className="text-xs text-muted-foreground">Prev: {previousTotals.orders}</p>
          </Card>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const CardContent = stat.link ? (
              <Link to={stat.link} className="h-full block">
                <Card className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </h3>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{stat.value}</p>
                </Card>
              </Link>
            ) : (
              <Card className="p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </h3>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl md:text-3xl font-bold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{stat.value}</p>
              </Card>
            );
            return <div key={stat.title} className="h-full">{CardContent}</div>;
          })}
        </div>

        {/* Recent Orders and Low Stock Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders
              </CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{Number(order.total_amount).toLocaleString()} ETB</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                          order.status === "delivered" ? "bg-green-500/10 text-green-500" :
                          "bg-blue-500/10 text-blue-500"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link to="/admin/orders">
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View All Orders
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent orders</p>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>Products running low on inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Current stock: {product.stock}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{Number(product.price).toLocaleString()} ETB</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.stock <= 5 ? "bg-red-500/10 text-red-500" :
                          product.stock <= 10 ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-green-500/10 text-green-500"
                        }`}>
                          {product.stock <= 5 ? "Critical" : product.stock <= 10 ? "Low" : "OK"}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link to="/admin/products">
                      <Button variant="outline" className="w-full">
                        <Package className="h-4 w-4 mr-2" />
                        Manage Products
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">All products are well stocked</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;