SELECT DISTINCT
    pc.id as comparison_id,

    ss.shaft_id,
    ss.depth,
    ss.depth_reported,
    ss.diameter,
    ss.diameter_reported,
    ss.grid_connection,
    ss.grid_connection_reported

FROM data_analytics.shaft_summary ss
JOIN data_clean.fact_pairwise_comparisons pc ON ss.shaft_id = pc.l_id