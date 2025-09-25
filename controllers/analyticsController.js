const { query } = require('../database/hybrid-init');

class AnalyticsController {
    // Track analytics events
    static async trackEvent(req, res) {
        try {
            const {
                event_type,
                product_id,
                category,
                search_query,
                filter_data
            } = req.body;

            // Validate required fields
            if (!event_type) {
                return res.status(400).json({
                    success: false,
                    error: 'event_type is required'
                });
            }

            // Get session info
            const session_id = req.sessionID || req.headers['session-id'] || 'anonymous';
            const user_agent = req.get('User-Agent') || null;
            const ip_address = req.ip || req.connection.remoteAddress || null;

            // Insert event
            const insertQuery = `
                INSERT INTO analytics_events (
                    event_type, product_id, category, search_query,
                    filter_data, session_id, user_agent, ip_address
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, created_at
            `;

            const result = await query(insertQuery, [
                event_type,
                product_id || null,
                category || null,
                search_query || null,
                filter_data ? JSON.stringify(filter_data) : null,
                session_id,
                user_agent,
                ip_address
            ]);

            res.json({
                success: true,
                event_id: result.rows[0].id,
                timestamp: result.rows[0].created_at
            });

        } catch (error) {
            console.error('Error tracking event:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Get analytics dashboard data
    static async getDashboard(req, res) {
        try {
            const queries = {
                // Top products by views
                topProductsByViews: `
                    SELECT p.id, p.title, p.category, pm.total_views, pm.total_cart_adds, pm.conversion_rate
                    FROM product_metrics pm
                    JOIN products p ON pm.product_id = p.id
                    WHERE p.is_active = true
                    ORDER BY pm.total_views DESC
                    LIMIT 10
                `,

                // Top searches
                topSearches: `
                    SELECT query, total_searches, results_count, last_searched_at
                    FROM search_analytics
                    ORDER BY total_searches DESC
                    LIMIT 10
                `,

                // Searches with no results (opportunities)
                emptySearches: `
                    SELECT query, total_searches, last_searched_at
                    FROM search_analytics
                    WHERE results_count = 0
                    ORDER BY total_searches DESC
                    LIMIT 10
                `,

                // Category performance
                categoryStats: `
                    SELECT
                        p.category,
                        COUNT(pm.product_id) as products_count,
                        SUM(pm.total_views) as total_views,
                        SUM(pm.total_cart_adds) as total_cart_adds,
                        ROUND(AVG(pm.conversion_rate), 2) as avg_conversion_rate
                    FROM product_metrics pm
                    JOIN products p ON pm.product_id = p.id
                    WHERE p.is_active = true AND p.category IS NOT NULL
                    GROUP BY p.category
                    ORDER BY total_views DESC
                `,

                // Recent events summary
                recentActivity: `
                    SELECT
                        event_type,
                        COUNT(*) as count,
                        MAX(created_at) as last_event
                    FROM analytics_events
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY event_type
                    ORDER BY count DESC
                `,

                // Overall stats
                overallStats: `
                    SELECT
                        COUNT(CASE WHEN event_type = 'product_view' THEN 1 END) as total_product_views,
                        COUNT(CASE WHEN event_type = 'cart_add' THEN 1 END) as total_cart_adds,
                        COUNT(CASE WHEN event_type = 'search' THEN 1 END) as total_searches,
                        COUNT(DISTINCT session_id) as unique_sessions
                    FROM analytics_events
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                `
            };

            const results = {};

            // Execute all queries
            for (const [key, queryStr] of Object.entries(queries)) {
                const result = await query(queryStr);
                results[key] = result.rows;
            }

            res.json({
                success: true,
                data: results,
                generated_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting dashboard data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Get product-specific analytics
    static async getProductAnalytics(req, res) {
        try {
            const { productId } = req.params;

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    error: 'Product ID is required'
                });
            }

            // Get product metrics
            const metricsQuery = `
                SELECT
                    p.id, p.title, p.category, p.price, p.sale_price,
                    COALESCE(pm.total_views, 0) as total_views,
                    COALESCE(pm.total_cart_adds, 0) as total_cart_adds,
                    COALESCE(pm.conversion_rate, 0) as conversion_rate,
                    pm.last_viewed_at
                FROM products p
                LEFT JOIN product_metrics pm ON p.id = pm.product_id
                WHERE p.id = $1
            `;

            // Get recent events for this product
            const eventsQuery = `
                SELECT event_type, created_at, category, filter_data
                FROM analytics_events
                WHERE product_id = $1
                ORDER BY created_at DESC
                LIMIT 50
            `;

            const [metricsResult, eventsResult] = await Promise.all([
                query(metricsQuery, [productId]),
                query(eventsQuery, [productId])
            ]);

            if (metricsResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }

            res.json({
                success: true,
                product: metricsResult.rows[0],
                recent_events: eventsResult.rows
            });

        } catch (error) {
            console.error('Error getting product analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    // Get search analytics
    static async getSearchAnalytics(req, res) {
        try {
            const { period = '7d' } = req.query;

            let timeFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
            if (period === '30d') {
                timeFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
            } else if (period === '24h') {
                timeFilter = "WHERE created_at >= NOW() - INTERVAL '24 hours'";
            }

            const searchStatsQuery = `
                SELECT
                    search_query,
                    COUNT(*) as search_count,
                    COALESCE(AVG((filter_data->>'results_count')::INTEGER), 0) as avg_results
                FROM analytics_events
                ${timeFilter} AND event_type = 'search' AND search_query IS NOT NULL
                GROUP BY search_query
                ORDER BY search_count DESC
                LIMIT 20
            `;

            const result = await query(searchStatsQuery);

            res.json({
                success: true,
                period: period,
                searches: result.rows,
                generated_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting search analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}

module.exports = AnalyticsController;