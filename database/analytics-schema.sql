-- Analytics Tables for TICS Store

-- General analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'product_view', 'cart_add', 'search', 'filter_use'
    product_id INTEGER NULL,
    category VARCHAR(100) NULL,
    search_query TEXT NULL,
    filter_data JSONB NULL,
    session_id VARCHAR(100) NULL,
    user_agent TEXT NULL,
    ip_address INET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
);

-- Product metrics aggregated table
CREATE TABLE IF NOT EXISTS product_metrics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    total_views INTEGER DEFAULT 0,
    total_cart_adds INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP NULL,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00, -- cart_adds / views * 100
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE(product_id)
);

-- Search queries analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,2) DEFAULT 0.00,
    total_searches INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(query)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product ON analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_product_metrics_views ON product_metrics(total_views DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_searches ON search_analytics(total_searches DESC);

-- Function to update product metrics automatically
CREATE OR REPLACE FUNCTION update_product_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'product_view' AND NEW.product_id IS NOT NULL THEN
        INSERT INTO product_metrics (product_id, total_views, last_viewed_at)
        VALUES (NEW.product_id, 1, NEW.created_at)
        ON CONFLICT (product_id)
        DO UPDATE SET
            total_views = product_metrics.total_views + 1,
            last_viewed_at = NEW.created_at,
            updated_at = NEW.created_at;

    ELSIF NEW.event_type = 'cart_add' AND NEW.product_id IS NOT NULL THEN
        INSERT INTO product_metrics (product_id, total_cart_adds)
        VALUES (NEW.product_id, 1)
        ON CONFLICT (product_id)
        DO UPDATE SET
            total_cart_adds = product_metrics.total_cart_adds + 1,
            updated_at = NEW.created_at;
    END IF;

    -- Update conversion rate
    UPDATE product_metrics
    SET conversion_rate = CASE
        WHEN total_views > 0 THEN (total_cart_adds::DECIMAL / total_views::DECIMAL) * 100
        ELSE 0
    END
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update metrics
CREATE TRIGGER analytics_events_trigger
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_product_metrics();

-- Function to update search analytics
CREATE OR REPLACE FUNCTION update_search_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'search' AND NEW.search_query IS NOT NULL THEN
        INSERT INTO search_analytics (query, results_count, total_searches, last_searched_at)
        VALUES (NEW.search_query,
               COALESCE((NEW.filter_data->>'results_count')::INTEGER, 0),
               1,
               NEW.created_at)
        ON CONFLICT (query)
        DO UPDATE SET
            total_searches = search_analytics.total_searches + 1,
            results_count = COALESCE((NEW.filter_data->>'results_count')::INTEGER, search_analytics.results_count),
            last_searched_at = NEW.created_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search analytics
CREATE TRIGGER search_analytics_trigger
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_search_analytics();