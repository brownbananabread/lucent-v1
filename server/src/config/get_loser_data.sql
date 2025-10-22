SELECT DISTINCT
    pc.id as comparison_id,
    t0.mine_id as mine_id,
    t0.mine_name,
    t0.latitude,
    t0.longitude,
    t0.country,

    -- T1 Technical Parameters
    COALESCE(t1.no_shafts, 0) as t1_no_shafts,
    COALESCE(t1.reported_no_shafts, 0) as t1_reported_no_shafts,
    COALESCE(t1.total_shaft_volume, 0) as t1_total_shaft_volume,
    COALESCE(t1.avg_diameter_m, 0) as t1_avg_diameter_m,
    COALESCE(t1.avg_depth_m, 0) as t1_avg_depth_m,
    COALESCE(t1.is_coal_mine, false) as t1_is_coal_mine,

    -- T2 Site Conditions
    COALESCE(t2.status, '') as t2_status,
    COALESCE(t2.nearest_train_station_km, 0) as t2_nearest_train_station_km,
    COALESCE(t2.nearest_airport_km, 0) as t2_nearest_airport_km,

    -- T3 Grid Integration
    COALESCE(t3.has_grid_connection, false) as t3_has_grid_connection,
    COALESCE(t3.in_rez_zone, false) as t3_in_rez_zone,

    -- T4 Financial Analysis
    COALESCE(t4.has_company, false) as t4_has_company,

    -- T5 Investment Analysis
    COALESCE(t5.has_evaluation, false) as t5_has_evaluation,
    COALESCE(t5.has_identity, false) as t5_has_identity

FROM data_analytics.t0_overview t0
LEFT JOIN data_analytics.t1_technical_parameters t1 ON t0.mine_id = t1.mine_id
LEFT JOIN data_analytics.t2_site_specific_conditions t2 ON t0.mine_id = t2.mine_id
LEFT JOIN data_analytics.t3_grid_integration t3 ON t0.mine_id = t3.mine_id
LEFT JOIN data_analytics.t4_financial_analysis t4 ON t0.mine_id = t4.mine_id
LEFT JOIN data_analytics.t5_investment_analysis t5 ON t0.mine_id = t5.mine_id
JOIN data_clean.fact_pairwise_comparisons pc ON t0.mine_id = pc.l_id
WHERE t0.mine_id IS NOT NULL