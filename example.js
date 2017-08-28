'use strict';

const grafana = require('./index');
const Row = grafana.Row;
const Dashboard = grafana.Dashboard;
const Panels = grafana.Panels;
const Target = grafana.Target;

// For grafana v1, the URL should look something like:
//
//   https://your.grafana.com/elasticsearch/grafana-dash/dashboard/
//
// Bascially, grafana v1 used elastic search as its backend, but grafana v2
// has its own backend. Because of this, the URL for grafana v2 should look
// something like this:
//
//   https://your.grafanahost.com/grafana2/api/dashboards/db/

grafana.configure({
    url: 'https://put_your_dashbord_url/api/dashboards/db',
    token: 'put_token_here'
});

// Dashboard Constants
const TITLE = 'TEST API dashboard';
const TAGS = ['myapp', 'platform'];
const TEMPLATING = [{
    name: 'dc',
    options: ['dc1', 'dc2']
}, {
    name: 'smoothing',
    options: ['30min', '10min', '5min', '2min', '1min']
}];
const ANNOTATIONS = [{
    name: 'Deploy',
    target: 'stats.$dc.production.deploy'
}];
const REFRESH = '1m';

// Target prefixes
const SERVER_PREFIX = 'servers.app*-$dc.myapp.';
const COUNT_PREFIX = 'stats.$dc.counts.myapp.';

function generateDashboard() {
    // Rows
    const volumeRow = new Row({
        title: 'Request Volume'
    });
    const systemRow = new Row({
        title: 'System / OS'
    });

    // Panels: request volume
    const rpsGraphPanel = new Panels.Graph({
        title: 'req/sec',
        span: 8,
        targets: [
            new Target(COUNT_PREFIX + 'statusCode.*').transformNull(0).sum().hitcount('1seconds').scale(0.1).alias('rps')
        ]
    });
    const rpsStatPanel = new Panels.SingleStat({
        title: 'Current Request Volume',
        postfix: 'req/sec',
        span: 4,
        targets: [
            new Target(COUNT_PREFIX + 'statusCode.*').sum().scale(0.1)
        ]
    });

    // Panels: system health
    const cpuGraph = new Panels.Graph({
        title: 'CPU',
        span: 4,
        targets: [
            new Target(SERVER_PREFIX + 'cpu.user').nonNegativeDerivative().scale(1 / 60).scale(100).averageSeries().alias('avg'),
            new Target(SERVER_PREFIX + 'cpu.user').nonNegativeDerivative().scale(1 / 60).scale(100).percentileOfSeries(95, false).alias('p95')
        ]
    });
    const rssGraph = new Panels.Graph({
        title: 'Memory',
        span: 4,
        targets: [
            new Target(SERVER_PREFIX + 'memory.rss').averageSeries().alias('rss')
        ]
    });
    const fdsGraph = new Panels.Graph({
        title: 'FDs',
        span: 4,
        targets: [
            new Target(SERVER_PREFIX + 'fds').averageSeries().movingAverage('10min').alias('moving avg')
        ]
    });

    // Dashboard
    const dashboard = new Dashboard({
        title: TITLE,
        tags: TAGS,
        templating: TEMPLATING,
        annotations: ANNOTATIONS,
        refresh: REFRESH
    });

    // Layout: panels
    volumeRow.addPanel(rpsGraphPanel);
    volumeRow.addPanel(rpsStatPanel);
    systemRow.addPanel(cpuGraph);
    systemRow.addPanel(rssGraph);
    systemRow.addPanel(fdsGraph);

    // Layout: rows
    dashboard.addRow(volumeRow);
    dashboard.addRow(systemRow);

    // Finish
    grafana.publish(dashboard);
}

module.exports = {
    generate: generateDashboard
};

if (require.main === module) {
    generateDashboard();
}
