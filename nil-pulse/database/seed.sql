-- NIL Pulse Database Seed Data
-- Initial data for development and production

-- Insert demo user profile (should be created via Supabase Auth first)
-- This is handled by the application, but we can insert a demo profile
INSERT INTO user_profiles (id, email, name, role, access_level, is_active, metadata) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'demo@nilpulse.com', 'Demo User', 'demo', 'standard', true, '{"demo": true, "created_by": "seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'admin@nilpulse.com', 'Admin User', 'admin', 'enterprise', true, '{"admin": true, "created_by": "seed"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- Insert initial NIL sources
INSERT INTO nil_sources (name, description, url, source_type, category, jurisdiction, reliability_score, update_frequency, is_active, harvest_config) VALUES
-- RSS Sources
('ESPN NIL', 'ESPN NIL coverage and news', 'https://www.espn.com/college-sports/nil/rss', 'rss', 'news', 'National', 90, 1800, true, '{"rss_feed": true}'::jsonb),
('Sports Illustrated NIL', 'Sports Illustrated NIL reporting', 'https://www.si.com/college/nil/rss', 'rss', 'news', 'National', 85, 3600, true, '{"rss_feed": true}'::jsonb),
('The Athletic College Sports', 'The Athletic college sports coverage', 'https://theathletic.com/college/rss/', 'rss', 'news', 'National', 95, 1800, true, '{"rss_feed": true}'::jsonb),

-- Web Scraping Sources
('NCAA.org News', 'Official NCAA news and policy updates', 'https://www.ncaa.org/news', 'web', 'legal', 'National', 100, 3600, true, '{
  "articleSelector": ".news-item, article",
  "titleSelector": "h1, h2, .title",
  "contentSelector": ".content, .body, p",
  "linkSelector": "a[href]",
  "authorSelector": ".author, .byline"
}'::jsonb),

('On3 NIL Database', 'On3 NIL deal tracking and news', 'https://www.on3.com/nil/', 'web', 'deals', 'National', 80, 3600, true, '{
  "articleSelector": ".deal-item, .news-item",
  "titleSelector": "h2, h3, .deal-title",
  "contentSelector": ".deal-details, .content",
  "linkSelector": "a[href]"
}'::jsonb),

-- Legal and Policy Sources
('NIL Legal Updates', 'Legal news aggregator for NIL policies', 'https://example.com/nil-legal', 'web', 'legal', 'Multi-State', 85, 7200, true, '{
  "articleSelector": ".legal-update",
  "titleSelector": ".title",
  "contentSelector": ".update-content"
}'::jsonb);

-- Insert initial state laws (sample data)
INSERT INTO nil_state_laws (state_code, state_name, law_title, law_number, status, effective_date, last_updated, allows_high_school, disclosure_required, disclosure_threshold, collective_restrictions, prohibited_categories, summary, source_url) VALUES

('FL', 'Florida', 'Florida NIL Law', 'SB 646', 'active', '2021-07-01', '2024-01-15', false, true, 600.00, 
 ARRAY['5% fee cap', 'Must register with state'], 
 ARRAY['alcohol', 'gambling', 'tobacco', 'firearms'], 
 'Florida allows NIL deals for college athletes with disclosure requirements and collective regulations.',
 'https://www.flsenate.gov/Session/Bill/2021/646'),

('TX', 'Texas', 'Texas Fair Pay to Play Act', 'SB 1385', 'active', '2021-07-01', '2024-01-10', true, true, 500.00,
 ARRAY['Transparent fee structure', 'Must comply with NCAA rules'],
 ARRAY['alcohol', 'gambling', 'adult entertainment'],
 'Texas permits NIL compensation for college and high school athletes with comprehensive oversight.',
 'https://capitol.texas.gov/BillLookup/History.aspx?LegSess=87R&Bill=SB1385'),

('CA', 'California', 'Fair Pay to Play Act', 'SB 206', 'active', '2023-01-01', '2023-12-20', false, false, null,
 ARRAY['No collective restrictions specified'],
 ARRAY['alcohol', 'gambling'],
 'California was the first state to allow NIL compensation, with broad permissions and minimal restrictions.',
 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201920200SB206'),

('NY', 'New York', 'New York NIL Rights Act', 'A8093', 'proposed', null, '2024-01-01', false, true, 1000.00,
 ARRAY['Collective oversight required', 'University approval needed'],
 ARRAY['alcohol', 'gambling', 'tobacco', 'firearms', 'political campaigns'],
 'Proposed New York legislation would provide comprehensive NIL rights with strict oversight mechanisms.',
 'https://www.nysenate.gov/legislation/bills/2023/A8093'),

('OH', 'Ohio', 'Ohio Student Athlete NIL Rights', 'HB 287', 'active', '2021-07-01', '2023-11-15', false, true, 750.00,
 ARRAY['Transparency requirements', 'Conflict of interest disclosures'],
 ARRAY['alcohol', 'gambling', 'adult content'],
 'Ohio allows NIL deals with moderate disclosure requirements and standard prohibited categories.',
 'https://www.legislature.ohio.gov/legislation/legislation-summary?id=GA134-HB-287');

-- Insert sample NIL deals (realistic examples)
INSERT INTO nil_deals (athlete_name, sport, school, conference, class_year, brand_name, deal_type, deal_value, deal_value_type, deal_duration_months, state_code, jurisdiction, compliance_status, confidence_level, verification_status, announced_date, effective_date) VALUES

('Arch Manning', 'Football', 'University of Texas', 'Big 12', 'Freshman', 'Panini', 'endorsement', 500000, 'estimated', 12, 'TX', 'Texas', 'compliant', 'high', 'verified', '2024-01-15', '2024-01-15'),

('Paige Bueckers', 'Basketball', 'University of Connecticut', 'Big East', 'Senior', 'Nike', 'endorsement', 750000, 'estimated', 24, 'CT', 'Connecticut', 'compliant', 'high', 'verified', '2024-01-10', '2024-01-10'),

('Caleb Williams', 'Football', 'University of Southern California', 'Pac-12', 'Senior', 'Beats by Dre', 'endorsement', 300000, 'reported', 6, 'CA', 'California', 'compliant', 'medium', 'partially_verified', '2024-01-08', '2024-01-08'),

('LSU Gymnastics Team', 'Gymnastics', 'Louisiana State University', 'SEC', 'Team', 'ESPN', 'appearance', 50000, 'confirmed', 3, 'LA', 'Louisiana', 'compliant', 'high', 'verified', '2024-01-12', '2024-01-12'),

('Bronny James', 'Basketball', 'University of Southern California', 'Pac-12', 'Sophomore', 'PlayStation', 'social_media', 250000, 'estimated', 12, 'CA', 'California', 'under_review', 'medium', 'unverified', '2024-01-20', '2024-02-01');

-- Insert sample content to demonstrate the system
INSERT INTO nil_content_raw (source_id, url, title, content, author, published_at, content_hash, metadata, processing_status) VALUES
((SELECT id FROM nil_sources WHERE name = 'ESPN NIL' LIMIT 1), 
 'https://www.espn.com/college-sports/nil/story/sample-1', 
 'Major NIL Deal Announced for Top Quarterback', 
 'In a groundbreaking move, top quarterback prospect has signed a significant NIL deal worth an estimated $500,000 with a major sporting goods company. This deal represents one of the largest NIL agreements for a college freshman and sets a new precedent for quarterback valuations in the NIL market.',
 'ESPN Staff',
 NOW() - INTERVAL '2 hours',
 md5('sample-content-1'),
 '{"harvested_at": "2024-01-21T10:00:00Z", "source_type": "rss"}'::jsonb,
 'processed'),

((SELECT id FROM nil_sources WHERE name = 'NCAA.org News' LIMIT 1),
 'https://www.ncaa.org/news/nil-policy-update-2024',
 'NCAA Updates NIL Guidance for 2024 Season',
 'The NCAA has released updated guidance for Name, Image, and Likeness activities for the 2024 collegiate season. Key changes include enhanced transparency requirements, clarified collective regulations, and updated disclosure thresholds for various types of NIL agreements.',
 'NCAA Communications',
 NOW() - INTERVAL '1 day',
 md5('sample-content-2'),
 '{"harvested_at": "2024-01-20T14:30:00Z", "source_type": "web"}'::jsonb,
 'processed');

-- Process the raw content into structured content
INSERT INTO nil_content (raw_content_id, source_id, title, summary, content, author, url, published_at, processed_at, primary_category, secondary_categories, states_mentioned, sentiment_score, importance_score, trend_velocity, tags) 
SELECT 
  r.id,
  r.source_id,
  r.title,
  LEFT(r.content, 200) || '...' as summary,
  r.content,
  r.author,
  r.url,
  r.published_at,
  NOW(),
  CASE 
    WHEN r.content ILIKE '%policy%' OR r.content ILIKE '%guidance%' OR r.content ILIKE '%ncaa%' THEN 'policy'
    WHEN r.content ILIKE '%deal%' OR r.content ILIKE '%endorsement%' THEN 'deals'
    ELSE 'market_analysis'
  END as primary_category,
  ARRAY[]::text[] as secondary_categories,
  CASE 
    WHEN r.content ILIKE '%texas%' THEN ARRAY['TX']
    WHEN r.content ILIKE '%california%' THEN ARRAY['CA'] 
    ELSE ARRAY[]::text[]
  END as states_mentioned,
  0.2 as sentiment_score,
  CASE 
    WHEN r.content ILIKE '%ncaa%' THEN 90
    WHEN r.content ILIKE '%major%' OR r.content ILIKE '%significant%' THEN 80
    ELSE 60
  END as importance_score,
  1.5 as trend_velocity,
  string_to_array(
    CASE 
      WHEN r.content ILIKE '%nil%' THEN 'nil,'
      ELSE ''
    END ||
    CASE 
      WHEN r.content ILIKE '%quarterback%' THEN 'quarterback,'
      ELSE ''
    END ||
    CASE 
      WHEN r.content ILIKE '%deal%' THEN 'deal,'
      ELSE ''
    END ||
    CASE 
      WHEN r.content ILIKE '%ncaa%' THEN 'ncaa,'
      ELSE ''
    END ||
    'college-sports', ','
  ) as tags
FROM nil_content_raw r
WHERE r.processing_status = 'processed';

-- Insert sample trends
INSERT INTO nil_trends (trend_type, trend_key, trend_category, mention_count, unique_sources, velocity, acceleration, peak_velocity, period_start, period_end, sentiment_avg, importance_avg, related_trends, top_jurisdictions, top_sources) VALUES

('topic', 'quarterback nil deals', 'deals', 15, 5, 2.5, 0.8, 3.2, NOW() - INTERVAL '24 hours', NOW(), 0.3, 82.5, 
 ARRAY['nil policy', 'college football'], 
 '[{"jurisdiction": "Texas", "activity_count": 8, "percentage": 53.3}, {"jurisdiction": "California", "activity_count": 4, "percentage": 26.7}]'::jsonb,
 '[{"source_id": "' || (SELECT id FROM nil_sources WHERE name = 'ESPN NIL' LIMIT 1) || '", "source_name": "ESPN NIL", "activity_count": 6, "percentage": 40.0}]'::jsonb),

('entity', 'ncaa policy updates', 'policy', 8, 3, 1.2, -0.3, 2.1, NOW() - INTERVAL '24 hours', NOW(), 0.1, 88.0,
 ARRAY['nil guidance', 'compliance'],
 '[{"jurisdiction": "National", "activity_count": 8, "percentage": 100.0}]'::jsonb,
 '[{"source_id": "' || (SELECT id FROM nil_sources WHERE name = 'NCAA.org News' LIMIT 1) || '", "source_name": "NCAA.org News", "activity_count": 4, "percentage": 50.0}]'::jsonb);

-- Insert sample user alerts for demo purposes
INSERT INTO nil_user_alerts (user_id, name, description, is_active, keywords, categories, jurisdictions, sports, importance_threshold, delivery_channels, delivery_frequency, trigger_count) VALUES

('00000000-0000-0000-0000-000000000001'::uuid, 'High Value Deals', 'Alert for NIL deals over $100k', true, 
 ARRAY['deal', 'endorsement', 'partnership'], 
 ARRAY['deals']::text[], 
 ARRAY['TX', 'CA', 'FL'], 
 ARRAY['football', 'basketball'], 
 70, 
 '{"email": true, "push": false}'::jsonb, 
 'immediate', 
 0),

('00000000-0000-0000-0000-000000000001'::uuid, 'Policy Updates', 'NCAA and state policy changes', true,
 ARRAY['policy', 'ncaa', 'guidance', 'rule'], 
 ARRAY['policy', 'legislation']::text[], 
 ARRAY[], 
 ARRAY[], 
 80, 
 '{"email": true}'::jsonb, 
 'daily', 
 0);

-- Update statistics for dashboard
UPDATE nil_sources SET last_harvested = NOW() - INTERVAL '30 minutes' WHERE is_active = true;

-- Add some sample analytics events
INSERT INTO analytics_events (user_id, session_id, event_type, event_data, timestamp, page_url) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'demo-session-1', 'login', '{"method": "password"}'::jsonb, NOW() - INTERVAL '2 hours', '/login'),
('00000000-0000-0000-0000-000000000001'::uuid, 'demo-session-1', 'page_view', '{"page": "dashboard"}'::jsonb, NOW() - INTERVAL '2 hours', '/'),
('00000000-0000-0000-0000-000000000001'::uuid, 'demo-session-1', 'page_view', '{"page": "deals"}'::jsonb, NOW() - INTERVAL '1 hour', '/deals'),
('00000000-0000-0000-0000-000000000002'::uuid, 'admin-session-1', 'login', '{"method": "password"}'::jsonb, NOW() - INTERVAL '4 hours', '/login');

-- Create a user session record
INSERT INTO user_sessions (user_id, session_id, started_at, pages_visited, interactions_count, is_active) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'demo-session-1', NOW() - INTERVAL '2 hours', 3, 8, true),
('00000000-0000-0000-0000-000000000002'::uuid, 'admin-session-1', NOW() - INTERVAL '4 hours', 5, 12, false);

-- Log successful seeding
DO $$
BEGIN
    RAISE NOTICE 'NIL Pulse database seeded successfully with sample data';
    RAISE NOTICE 'Demo user: demo@nilpulse.com';
    RAISE NOTICE 'Admin user: admin@nilpulse.com';
    RAISE NOTICE 'Created % sources, % deals, % content items', 
        (SELECT COUNT(*) FROM nil_sources),
        (SELECT COUNT(*) FROM nil_deals),
        (SELECT COUNT(*) FROM nil_content);
END $$;