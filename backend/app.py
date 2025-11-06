import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
from datetime import datetime, timedelta
import jwt

# Initialize Flask app first
app = Flask(__name__)
# Enable CORS for all routes with more permissive settings
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Add basic error handling
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Route not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

# Constants
APP_ROOT = os.path.dirname(__file__)
DATA_PATH = os.path.join(APP_ROOT, 'RPA_Bot_Data_Synthetic_800_Rows.csv')
MODEL_PATH = os.path.join(APP_ROOT, 'model.pkl')

JWT_SECRET = os.environ.get('JWT_SECRET', 'supersecretkey')
JWT_ALGO = 'HS256'

# Remove heavy analytics engine; using lightweight stdlib computations

# JWT decorator
def require_jwt(fn):
    def wrapper(*args, **kwargs):
        auth = request.headers.get('Authorization', None)
        if not auth or not auth.startswith('Bearer '):
            return jsonify({'error':'Missing or invalid token'}), 401
        token = auth.split(' ')[1]
        try:
            jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        except Exception as e:
            return jsonify({'error':'Token invalid','detail':str(e)}), 401
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

def parse_float(val, default=0.0):
    try:
        return float(val)
    except Exception:
        return default

def parse_int(val, default=0):
    try:
        return int(val)
    except Exception:
        try:
            return int(float(val))
        except Exception:
            return default

def to_datetime(ts):
    if isinstance(ts, datetime):
        return ts
    if ts is None:
        return None
    s = str(ts)
    # try iso with space replaced
    try:
        return datetime.fromisoformat(s.replace(' ', 'T'))
    except Exception:
        pass
    # try YYYY-MM-DD HH:MM
    try:
        return datetime.strptime(s, '%Y-%m-%d %H:%M')
    except Exception:
        pass
    # try DD-MM-YYYY HH:MM
    try:
        return datetime.strptime(s, '%d-%m-%Y %H:%M')
    except Exception:
        return None

def load_data():
    records = []
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # normalize and parse fields
                row['Bot Name'] = row.get('Bot Name') or row.get('Bot_Name') or 'unknown'
                row['Success Rate (%)'] = parse_float(row.get('Success Rate (%)', 0))
                row['Average Execution Time (s)'] = parse_float(row.get('Average Execution Time (s)', 0))
                row['Last Status'] = (row.get('Last Status') or '').strip() or 'unknown'
                row['Run Count'] = parse_int(row.get('Run Count', 0))
                row['Failure Count'] = parse_int(row.get('Failure Count', 0))
                row['Owner'] = (row.get('Owner') or 'unknown').strip()
                row['Version'] = row.get('Version') or ''
                row['Priority'] = row.get('Priority') or ''
                ts = row.get('Last Run Timestamp') or row.get('Last_Run_Timestamp')
                try:
                    row['Last Run Timestamp'] = datetime.fromisoformat(str(ts).replace(' ', 'T'))
                except Exception:
                    try:
                        row['Last Run Timestamp'] = datetime.strptime(str(ts), '%Y-%m-%d %H:%M')
                    except Exception:
                        try:
                            # Support DD-MM-YYYY HH:MM format present in CSV
                            row['Last Run Timestamp'] = datetime.strptime(str(ts), '%d-%m-%Y %H:%M')
                        except Exception:
                            row['Last Run Timestamp'] = None
                records.append(row)
    else:
        # fallback synthetic minimal data
        records = [
            {
                'Bot Name': 'bot1', 'Success Rate (%)': 90.0, 'Average Execution Time (s)': 2.3,
                'Last Status': 'successfully ran', 'Run Count': 100, 'Failure Count': 2,
                'Owner': 'user1', 'Last Run Timestamp': datetime(2023,1,1,0,0), 'Version':'v1.0', 'Priority':'Low'
            },
            {
                'Bot Name': 'bot2', 'Success Rate (%)': 75.0, 'Average Execution Time (s)': 5.1,
                'Last Status': 'failed', 'Run Count': 200, 'Failure Count': 20,
                'Owner': 'user2', 'Last Run Timestamp': datetime(2023,1,2,12,0), 'Version':'v1.1', 'Priority':'High'
            },
            {
                'Bot Name': 'bot3', 'Success Rate (%)': 60.0, 'Average Execution Time (s)': 7.2,
                'Last Status': 'pending', 'Run Count': 50, 'Failure Count': 10,
                'Owner': 'user3', 'Last Run Timestamp': datetime(2023,1,3,0,0), 'Version':'v2.0', 'Priority':'Medium'
            },
        ]
    return records

@app.route('/api/auth', methods=['POST'])
def auth():
    # Simple username/password (demo only)
    data = request.json or {}
    user = data.get('username')
    pw = data.get('password')
    # Replace with real user check
    if user == 'admin' and pw == 'admin123':
        payload = {'user': user, 'exp': datetime.utcnow() + timedelta(hours=2)}
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
        return jsonify({'token': token})
    return jsonify({'error':'Invalid credentials'}), 401

DATA = load_data()
RISK_MODEL = None
MODEL = None

@app.route('/')
def root():
    return jsonify({
        'status': 'API is running',
        'endpoints': [
            '/api/health',
            '/api/overview',
            '/api/errors',
            '/api/performance',
            '/api/alerts',
            '/api/summary'
        ]
    })

@app.route('/api/health')
def health():
    return jsonify({'status':'ok','time': datetime.utcnow().isoformat()})

@app.route('/api/overview')
def overview():
    data = list(DATA)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    status = request.args.get('status')
    priority = request.args.get('priority')
    owner = request.args.get('owner')

    def within_date(rec):
        ts = to_datetime(rec.get('Last Run Timestamp'))
        if not ts:
            return False
        if start_date:
            try:
                if ts.date() < datetime.fromisoformat(start_date).date():
                    return False
            except Exception:
                pass
        if end_date:
            try:
                if ts.date() > datetime.fromisoformat(end_date).date():
                    return False
            except Exception:
                pass
        return True

    filtered = [r for r in data if within_date(r)]
    if status:
        filtered = [r for r in filtered if str(r.get('Last Status','')).lower() == status.lower()]
    if priority:
        filtered = [r for r in filtered if str(r.get('Priority','')).lower() == priority.lower()]
    if owner:
        filtered = [r for r in filtered if str(r.get('Owner','')) == owner]

    total_bots = len(filtered)
    active = len([r for r in filtered if 'failed' not in str(r.get('Last Status','')).lower() and 'pending' not in str(r.get('Last Status','')).lower()])
    # averages
    succ_vals = [parse_float(r.get('Success Rate (%)', 0)) for r in filtered]
    exec_vals = [parse_float(r.get('Average Execution Time (s)', 0)) for r in filtered]
    avg_success = round(sum(succ_vals)/len(succ_vals), 2) if succ_vals else None
    avg_exec = round(sum(exec_vals)/len(exec_vals), 2) if exec_vals else None

    # time series by day
    by_day = {}
    for r in filtered:
        ts = to_datetime(r.get('Last Run Timestamp'))
        if not ts:
            continue
        day = ts.date().isoformat()
        by_day.setdefault(day, {'active_bots':0, 'succ':[], 'exec':[]})
        ok = ('failed' not in str(r.get('Last Status','')).lower() and 'pending' not in str(r.get('Last Status','')).lower())
        by_day[day]['active_bots'] += 1 if ok else 0
        by_day[day]['succ'].append(parse_float(r.get('Success Rate (%)', 0)))
        by_day[day]['exec'].append(parse_float(r.get('Average Execution Time (s)', 0)))
    time_series = []
    for d in sorted(by_day.keys()):
        vals = by_day[d]
        s_mean = round(sum(vals['succ'])/len(vals['succ']), 2) if vals['succ'] else 0
        e_mean = round(sum(vals['exec'])/len(vals['exec']), 2) if vals['exec'] else 0
        time_series.append({'timestamp': d, 'active_bots': vals['active_bots'], 'success_rate': s_mean, 'avg_execution_time': e_mean})

    return jsonify({
        'total_bots': int(total_bots),
        'active_bots': int(active),
        'avg_success_rate': avg_success,
        'avg_execution_time_s': avg_exec,
        'time_series': time_series
    })

@app.route('/api/errors')
def errors():
    try:
        selected_user = request.args.get('user', '')
        users = sorted(list({r.get('Owner') for r in DATA if r.get('Owner')}))
        filtered = [r for r in DATA if (r.get('Owner') == selected_user) or not selected_user]
        # failure by status
        by_status = {}
        for r in filtered:
            st = str(r.get('Last Status',''))
            by_status[st] = by_status.get(st, 0) + parse_int(r.get('Failure Count', 0))
        by_status = {k:int(v) for k,v in by_status.items() if v > 0}
        # recent by timestamp desc
        recent = [r for r in filtered if r.get('Last Run Timestamp')]
        recent.sort(key=lambda x: x.get('Last Run Timestamp'), reverse=True)
        recent = recent[:20]
        # convert datetimes to strings without mutating shared DATA
        recent_out = []
        for r in recent:
            ts = to_datetime(r.get('Last Run Timestamp'))
            ts_str = ts.isoformat(sep=' ') if isinstance(ts, datetime) else (str(r.get('Last Run Timestamp')) if r.get('Last Run Timestamp') is not None else None)
            rr = dict(r)
            rr['Last Run Timestamp'] = ts_str
            recent_out.append(rr)
        return jsonify({'failure_by_status': by_status, 'recent': recent_out, 'users': users, 'selected_user': selected_user})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/performance')
def performance():
    perf = []
    for r in DATA:
        perf.append({
            'bot_name': r.get('Bot Name'),
            'avg_execution_time_s': parse_float(r.get('Average Execution Time (s)', 0)),
            'success_rate': parse_float(r.get('Success Rate (%)', 0))
        })
    by_day = {}
    for r in DATA:
        ts = to_datetime(r.get('Last Run Timestamp'))
        if not ts:
            continue
        d = ts.date().isoformat()
        by_day.setdefault(d, {'succ': [], 'count': 0})
        by_day[d]['succ'].append(parse_float(r.get('Success Rate (%)', 0)))
        by_day[d]['count'] += 1
    time_series = []
    for d in sorted(by_day.keys()):
        s = by_day[d]
        mean_s = round(sum(s['succ'])/len(s['succ']), 2) if s['succ'] else 0
        time_series.append({'date': d, 'avg_success_rate': mean_s, 'total_bots': s['count']})
    return jsonify({'performance': perf, 'time_series': time_series})

@app.route('/api/alerts')
def alerts():
    try:
        # compute means for normalization
        exec_times = [parse_float(r.get('Average Execution Time (s)', 0)) for r in DATA if r.get('Average Execution Time (s)')]
        avg_exec_overall = (sum(exec_times)/len(exec_times)) if exec_times else 1.0
        alerts = []
        for r in DATA:
            failures = parse_float(r.get('Failure Count', 0))
            runs = max(1.0, parse_float(r.get('Run Count', 1)))
            success_rate = parse_float(r.get('Success Rate (%)', 0))
            avg_exec_time = parse_float(r.get('Average Execution Time (s)', 0))
            failure_rate = min(1.0, failures / runs)
            success_impact = (100.0 - success_rate) / 100.0
            exec_time_impact = min(1.0, avg_exec_time / (2 * avg_exec_overall)) if avg_exec_overall else 0.0
            risk_score = failure_rate * 0.4 + success_impact * 0.4 + exec_time_impact * 0.2
            severity = 'critical' if (failures > 40 or success_rate < 85 or risk_score > 0.7) else (
                       'warning' if (failures > 20 or success_rate < 95 or risk_score > 0.4) else 'info')
            alert_type = []
            if failures > 20:
                alert_type.append('High Failure Rate')
            if success_rate < 90:
                alert_type.append('Low Success Rate')
            if avg_exec_time > avg_exec_overall * 1.5:
                alert_type.append('High Execution Time')
            alert_type = ' & '.join(alert_type) if alert_type else 'Performance Warning'
            ts = r.get('Last Run Timestamp')
            alerts.append({
                'bot_name': r.get('Bot Name'),
                'alert_type': alert_type,
                'severity': severity,
                'timestamp': ts.isoformat(sep=' ') if isinstance(ts, datetime) else str(ts),
                'risk_score': round(risk_score * 100, 1),
                'anomaly_score': None,
                'is_anomaly': False,
                'failure_count': int(failures),
                'success_rate': round(float(success_rate), 1)
            })
        alerts.sort(key=lambda x: (-1 if x['severity']=='critical' else 0, -x['risk_score']))
        return jsonify({'alerts': alerts[:20]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summary')
def summary():
    try:
        user = request.args.get('user')
        records = DATA
        if user and user != 'all':
            records = [r for r in records if r.get('Owner') == user]
            if not records:
                return jsonify({'error': f'No data found for user {user}'}), 404
        total_runs = sum(parse_int(r.get('Run Count', 0)) for r in records)
        success_vals = [parse_float(r.get('Success Rate (%)', 0)) for r in records]
        exec_vals = [parse_float(r.get('Average Execution Time (s)', 0)) for r in records]
        total_errors = sum(parse_int(r.get('Failure Count', 0)) for r in records)
        bots_list = [{
            'name': r.get('Bot Name'),
            'total_runs': parse_int(r.get('Run Count', 0)),
            'success_rate': parse_float(r.get('Success Rate (%)', 0)),
            'avg_exec_time': parse_float(r.get('Average Execution Time (s)', 0)),
            'error_count': parse_int(r.get('Failure Count', 0))
        } for r in records]
        result = {
            'summary': {
                'total_runs': int(total_runs),
                'success_rate': round(sum(success_vals)/len(success_vals), 2) if success_vals else 0,
                'avg_execution_time': round(sum(exec_vals)/len(exec_vals), 2) if exec_vals else 0,
                'total_errors': int(total_errors),
                'bots': bots_list
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to generate summary'}), 500

@app.route('/api/users')
def users():
    try:
        owners = sorted(list({str(r.get('Owner')) for r in DATA if r.get('Owner') is not None}))
        return jsonify(owners)
    except Exception:
        return jsonify([])

@app.route('/api/analytics/dashboard')
def analytics():
    # Build analytics response expected by frontend (no pandas)
    try:
        records = DATA
        total_runs = sum(parse_int(r.get('Run Count', 0)) for r in records)
        success_vals = [parse_float(r.get('Success Rate (%)', 0)) for r in records]
        exec_vals = [parse_float(r.get('Average Execution Time (s)', 0)) for r in records]
        total_errors = sum(parse_int(r.get('Failure Count', 0)) for r in records)

        # users and per-user bots
        users = sorted(list({str(r.get('Owner')) for r in records if r.get('Owner') is not None}))
        userBots = {}
        for u in users:
            user_records = [r for r in records if str(r.get('Owner')) == u]
            userBots[u] = [{
                'name': r.get('Bot Name'),
                'total_runs': parse_int(r.get('Run Count', 0)),
                'success_rate': parse_float(r.get('Success Rate (%)', 0)),
                'avg_exec_time': parse_float(r.get('Average Execution Time (s)', 0)),
                'error_count': parse_int(r.get('Failure Count', 0))
            } for r in user_records]

        # status distribution
        status_distribution = {}
        for r in records:
            st = str(r.get('Last Status', ''))
            status_distribution[st] = status_distribution.get(st, 0) + 1

        # daily trends by date string
        daily_runs = {}
        daily_success = {}
        for r in records:
            ts = to_datetime(r.get('Last Run Timestamp'))
            if not ts:
                continue
            key = ts.date().isoformat()
            daily_runs[key] = daily_runs.get(key, 0) + parse_int(r.get('Run Count', 0))
            daily_success.setdefault(key, []).append(parse_float(r.get('Success Rate (%)', 0)))
        daily_success_mean = {k: (round(sum(v)/len(v), 2) if v else 0) for k, v in daily_success.items()}
        daily_trends = { 'Run Count': daily_runs, 'Success Rate (%)': daily_success_mean }

        # simple risk list
        exec_mean = (sum(exec_vals)/len(exec_vals)) if exec_vals else 1.0
        risk_list = []
        for r in records:
            failures = parse_float(r.get('Failure Count', 0))
            runs = max(1.0, parse_float(r.get('Run Count', 1)))
            success_rate = parse_float(r.get('Success Rate (%)', 0))
            avg_exec_time = parse_float(r.get('Average Execution Time (s)', 0))
            risk_prob = min(1.0, max(0.0, 0.4*(failures/runs) + 0.4*((100-success_rate)/100.0) + 0.2*(avg_exec_time/(2*exec_mean if exec_mean else 1.0))))
            risk_list.append({ 'Bot Name': r.get('Bot Name'), 'Owner': r.get('Owner'), 'Risk_Prob': round(risk_prob, 3) })

        response = {
            'total_runs': int(total_runs),
            'success_rate': round(sum(success_vals)/len(success_vals), 2) if success_vals else 0,
            'avg_execution_time': round(sum(exec_vals)/len(exec_vals), 2) if exec_vals else 0,
            'total_errors': int(total_errors),
            'users': users,
            'userBots': userBots,
            'status_distribution': status_distribution,
            'daily_trends': daily_trends,
            'risk_analysis': risk_list,
            'owner_insights': {
                'Bot Name': {u: len(userBots.get(u, [])) for u in users},
                'Success Rate (%)': {u: (round(sum([b['success_rate'] for b in userBots[u]])/len(userBots[u]), 2) if userBots.get(u) else 0) for u in users}
            }
        }
        return jsonify(response)
    except Exception as e:
        safe_response = {
            'total_runs': 0,
            'success_rate': 0,
            'avg_execution_time': 0,
            'total_errors': 0,
            'users': [],
            'userBots': {},
            'status_distribution': {},
            'daily_trends': {'Run Count': {}, 'Success Rate (%)': {}},
            'risk_analysis': [],
            'owner_insights': {'Bot Name': {}, 'Success Rate (%)': {}}
        }
        return jsonify(safe_response)



@app.route('/api/analysis/<bot_id>')
def get_bot_analysis(bot_id):
    # Lightweight analysis without pandas/sklearn
    try:
        matches = [r for r in DATA if str(r.get('Bot Name')) == str(bot_id)]
        if not matches:
            return jsonify({'error': f'Bot not found: {bot_id}'}), 404
        r = matches[0]
        run_count = parse_int(r.get('Run Count', 0))
        failure_count = parse_int(r.get('Failure Count', 0))
        success_rate = parse_float(r.get('Success Rate (%)', 0))
        avg_exec_time = parse_float(r.get('Average Execution Time (s)', 0))
        risk_probability = min(1.0, max(0.0, 0.5*(failure_count/max(run_count,1)) + 0.5*((100-success_rate)/100.0)))
        analysis = {
            'risk_probability': round(risk_probability, 3),
            'failure_rate': round(100.0 * failure_count / max(run_count, 1), 1),
            'recent_failures': failure_count,
            'recent_runs': run_count,
            'success_rate': success_rate,
            'anomaly_analysis': None,
            'is_anomalous': False,
            'anomaly_score': None,
            'recommendations': [
                'Monitor failure and success trends over time',
                'Investigate repeated failure reasons',
                'Optimize execution time if consistently high'
            ],
            'metric_impacts': None
        }
        return jsonify(analysis)
    except Exception:
        return jsonify({'error': 'Error calculating analysis'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# Analyze and process bots