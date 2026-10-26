-- sign-in: ada@app.test
-- Forty published items: scrolling, long titles, items with and without a summary.
select seed.item(format('Item %s%s', n, case when n % 7 = 0 then ' with a much longer title that wraps onto a second line' else '' end),
                 case when n % 3 = 0 then null else format('Summary for item %s.', n) end, sort => n + 10)
  from generate_series(1, 40) n;
