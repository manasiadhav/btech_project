
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
from datetime import datetime, timedelta
import jwt
from sklearn.ensemble import IsolationForest

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
DATA_PATH = os.path.join(APP_ROOT, '..', 'RPA_Bot_Data_Synthetic_800_Rows.csv')
MODEL_PATH = os.path.join(APP_ROOT, 'model.pkl')
JWT_SECRET = os.environ.get('JWT_SECRET', 'supersecretkey')
JWT_ALGO = 'HS256'

# Initialize analytics engine
from analytics import AnalyticsEngine
analytics_engine = AnalyticsEngine()

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

def load_data():
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
    else:
        # fallback: small synthetic dataframe
        df = pd.DataFrame({
            'Bot Name': ['bot1','bot2','bot3'],
            'Success Rate (%)': [90, 75, 60],
            'Average Execution Time (s)': [2.3, 5.1, 7.2],
            'Last Status': ['successfully ran','failed','pending'],
            'Run Count': [100, 200, 50],
            'Failure Count': [2, 20, 10],
            'Owner': ['user1','user2','user3'],
            'Last Run Timestamp': ['2023-01-01 00:00','2023-01-02 12:00','2023-01-03 00:00'],
            'Version': ['v1.0','v1.1','v2.0'],
            'Priority': ['Low','High','Medium']
        })
    # convert timestamp
    try:
        df['Last Run Timestamp'] = pd.to_datetime(df['Last Run Timestamp'], errors='coerce')
    except Exception:
        pass
    return df

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

def load_risk_model():
    model_path = os.path.join(APP_ROOT, 'bot_failure_risk_model.pkl')
    if os.path.exists(model_path):
        try:
            model_data = joblib.load(model_path)
            print('Loaded risk model successfully')
            return model_data
        except Exception as e:
            print('Risk model load error:', e)
            return None
    return None

DATA_DF = load_data()
RISK_MODEL = load_risk_model()
MODEL = None  # We're using RISK_MODEL now instead

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
    df = DATA_DF.copy()
    
    # Apply filters from query parameters
    # Get filter parameters with defaults for date range
    start_date = request.args.get('start_date', '2022-12-31')
    end_date = request.args.get('end_date', '2023-02-19')
    bot_type = request.args.get('bot_type')
    status = request.args.get('status')
    priority = request.args.get('priority')
    owner = request.args.get('owner')

    # Ensure dates are within valid range
    start_date = max(start_date, '2022-12-31')
    end_date = min(end_date, '2023-02-19')

    if start_date:
        df = df[df['Last Run Timestamp'] >= start_date]
    if end_date:
        df = df[df['Last Run Timestamp'] <= end_date]
    if bot_type:
        df = df[df['Bot Type'].str.lower() == bot_type.lower()]
    if status:
        df = df[df['Last Status'].str.lower() == status.lower()]
    if priority:
        df = df[df['Priority'].str.lower() == priority.lower()]
    if owner:
        df = df[df['Owner'] == owner]

    # Calculate overall metrics
    total_bots = df.shape[0]
    active = df[~df['Last Status'].str.contains('failed|pending', na=False, case=False)].shape[0]
    avg_success = float(df['Success Rate (%)'].mean()) if 'Success Rate (%)' in df else None
    avg_exec = float(df['Average Execution Time (s)'].mean()) if 'Average Execution Time (s)' in df else None
    uptime = round(avg_success,2) if avg_success is not None else None

    # Generate time series data
    if not df.empty:
        df['date'] = pd.to_datetime(df['Last Run Timestamp']).dt.date
        time_series = []
        
        for date, group in df.groupby('date'):
            time_series.append({
                'timestamp': date.isoformat(),
                'active_bots': int(group[~group['Last Status'].str.contains('failed|pending', na=False, case=False)].shape[0]),
                'success_rate': float(group['Success Rate (%)'].mean()),
                'avg_execution_time': float(group['Average Execution Time (s)'].mean())
            })
        
        # Sort by date
        time_series = sorted(time_series, key=lambda x: x['timestamp'])
    else:
        time_series = []

    return jsonify({
        'total_bots': int(total_bots),
        'active_bots': int(active),
        'avg_success_rate': uptime,
        'avg_execution_time_s': avg_exec,
        'time_series': time_series
    })

@app.route('/api/errors')
def errors():
    try:
        df = DATA_DF.copy()
        # Get the user filter from query parameters
        selected_user = request.args.get('user', '')
        
        # Get unique users from the Owner column
        users = sorted(df['Owner'].unique().tolist()) if 'Owner' in df else []
        
        # Filter data if user is selected
        filtered_df = df[df['Owner'] == selected_user] if selected_user else df
        print(f"Filtered data for user {selected_user}: {len(filtered_df)} rows")  # Debug log
        
        # Calculate failure by status for filtered data
        by_status = {}
        if 'Last Status' in filtered_df.columns and 'Failure Count' in filtered_df.columns:
            # Group by status and sum failures, ensuring we're using only the filtered data
            status_failures = filtered_df.groupby('Last Status', as_index=False)['Failure Count'].sum()
            # Create a dictionary from the grouped data, ensuring correct conversion to integers
            by_status = {str(row['Last Status']): int(row['Failure Count']) 
                        for _, row in status_failures.iterrows() 
                        if row['Failure Count'] > 0}
            print(f"Status failures for user {selected_user}: {by_status}")  # Debug log
        print(f"Failure by status: {by_status}")  # Debug log
        
        # Get recent entries from filtered data
        recent = filtered_df.sort_values('Last Run Timestamp', ascending=False).head(20).to_dict(orient='records')
        
        response_data = {
            'failure_by_status': by_status,
            'recent': recent,
            'users': users,
            'selected_user': selected_user  # Include selected user in response for verification
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in errors endpoint: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500

@app.route('/api/performance')
def performance():
    df = DATA_DF
    # Return both per-bot performance metrics and time series data
    perf = []
    for _, row in df.iterrows():
        perf.append({
            'bot_name': row.get('Bot Name'),
            'avg_execution_time_s': row.get('Average Execution Time (s)'),
            'success_rate': row.get('Success Rate (%)')
        })
    
    # Generate time series data for success rate graph
    df['date'] = pd.to_datetime(df['Last Run Timestamp']).dt.date
    time_series = []
    for date, group in df.groupby('date'):
        time_series.append({
            'date': date.isoformat(),
            'avg_success_rate': float(group['Success Rate (%)'].mean()),
            'total_bots': len(group)
        })
    
    # Sort by date
    time_series = sorted(time_series, key=lambda x: x['date'])
    
    return jsonify({
        'performance': perf,
        'time_series': time_series
    })



@app.route('/api/alerts')
def alerts():
    df = DATA_DF.copy()
    alerts = []
    
    # Calculate anomaly scores for all bots
    try:
        # Extract features for anomaly detection
        features = df[['Run Count', 'Failure Count', 'Success Rate (%)', 'Average Execution Time (s)']].copy()
        
        # Handle potential missing or infinite values
        features = features.fillna(features.mean())
        features = features.replace([np.inf, -np.inf], np.nan).fillna(features.mean())
        
        # Scale features using Robust scaling
        from sklearn.preprocessing import RobustScaler
        scaler = RobustScaler()
        features_scaled = scaler.fit_transform(features)
        
        # Train Isolation Forest
        iso_forest = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            max_samples='auto',
            random_state=42
        )
        
        # Get anomaly scores for all bots
        anomaly_scores = iso_forest.fit_predict(features_scaled)
        risk_scores = -iso_forest.score_samples(features_scaled)  # Negative scores so higher is more anomalous
        
        # Add scores to dataframe
        df['anomaly_score'] = risk_scores
        df['is_anomaly'] = anomaly_scores == -1
        
        # Calculate risk score based on actual metrics for each bot
        for idx, row in df.iterrows():
            failures = float(row.get('Failure Count', 0))
            runs = float(row.get('Run Count', 1))
            success_rate = float(row.get('Success Rate (%)', 0))
            avg_exec_time = float(row.get('Average Execution Time (s)', 0))
            
            # Calculate risk components
            failure_rate = min(1.0, failures / max(runs, 1))
            success_impact = (100 - success_rate) / 100
            exec_time_impact = min(1.0, avg_exec_time / (2 * df['Average Execution Time (s)'].mean()))
            
            # Calculate combined risk score
            risk_score = (
                failure_rate * 0.4 +  # 40% weight to failure rate
                success_impact * 0.4 +  # 40% weight to success rate impact
                exec_time_impact * 0.2  # 20% weight to execution time
            )
            
            df.at[idx, 'risk_score'] = risk_score
            
            # Determine severity and alert type
            severity = 'critical' if (failures > 40 or success_rate < 85 or risk_score > 0.7) else \
                      'warning' if (failures > 20 or success_rate < 95 or risk_score > 0.4) else 'info'
                      
            alert_type = []
            if row['is_anomaly']:
                alert_type.append('Anomalous Behavior')
            if failures > 20:
                alert_type.append('High Failure Rate')
            if success_rate < 90:
                alert_type.append('Low Success Rate')
                
            alert_type = ' & '.join(alert_type) if alert_type else 'Performance Warning'
            
            alerts.append({
                'bot_name': row['Bot Name'],
                'alert_type': alert_type,
                'severity': severity,
                'timestamp': str(row.get('Last Run Timestamp')),
                'risk_score': round(risk_score * 100, 1),
                'anomaly_score': round(float(row['anomaly_score']), 3),
                'is_anomaly': bool(row['is_anomaly']),
                'failure_count': int(failures),
                'success_rate': round(float(success_rate), 1)
            })
        
        # Sort alerts by risk score and anomaly status
        alerts.sort(key=lambda x: (-int(x['is_anomaly']), -x['risk_score']))
        
        # Return top 20 alerts
        return jsonify({'alerts': alerts[:20]})
        
    except Exception as e:
        print(f"Error calculating alerts: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/summary')
def summary():
    """Generate summary analytics with bot risk and anomaly analysis."""
    try:
        print("Starting summary request processing")  # Debug log
        df = DATA_DF.copy()
        if df is None or df.empty:
            return jsonify({'error': 'No data available'}), 500
        
        # Get user filter from query parameters
        user = request.args.get('user')
        print(f"Processing summary request for user: {user}")  # Debug log
        
        # Filter by user if specified
        if user and user != 'all':
            # Print available users
            print(f"Available users: {df['Owner'].unique().tolist()}")  # Debug log
            df = df[df['Owner'] == user]
            print(f"Found {len(df)} rows for user {user}")  # Debug log
            if df.empty:
                print(f"No data found for user {user}")  # Debug log
                return jsonify({'error': f'No data found for user {user}'}), 404
            
        # Print sample of filtered data
        print(f"Sample of filtered data:\n{df.head()}")  # Debug log
        
        # Get list of bots for the filtered data
        bots_list = []
        
        # Calculate bot risks and create list
        for _, row in df.iterrows():
            try:
                # Calculate comprehensive risk score with statistical basis
                failures = float(row.get('Failure Count', 0))
                runs = float(row.get('Run Count', 1))
                success_rate = float(row.get('Success Rate (%)', 0))
                avg_exec_time = float(row.get('Average Execution Time (s)', 0))
                
                # Calculate relative metrics compared to other bots
                avg_failure_rate = df['Failure Count'].sum() / max(df['Run Count'].sum(), 1)
                avg_success_rate = df['Success Rate (%)'].mean()
                avg_exec_time_overall = df['Average Execution Time (s)'].mean()
                
                # Calculate z-scores for each metric
                failure_ratio = min(1.0, failures / max(runs, 1))
                failure_zscore = (failure_ratio - avg_failure_rate) / max(df['Failure Count'].div(df['Run Count']).std(), 0.01)
                success_zscore = (success_rate - avg_success_rate) / max(df['Success Rate (%)'].std(), 0.01)
                exec_zscore = (avg_exec_time - avg_exec_time_overall) / max(df['Average Execution Time (s)'].std(), 0.01)
                
                # Calculate actual failure rate and success rate impact
                failure_rate = (failures / max(runs, 1)) * 100  # as percentage
                success_impact = (100 - success_rate) / 100  # Convert to 0-1 range
                
                # Direct risk calculation based on actual metrics
                if failures == 0 and success_rate >= 95:
                    # If no failures and very high success rate, force low risk
                    bot_risk = 0.2  # Low risk
                else:
                    # Calculate risk based on actual metrics
                    risk_components = [
                        min(1.0, failures / max(runs, 1)) * 0.4,  # 40% weight to failure rate
                        success_impact * 0.4,  # 40% weight to success rate impact
                        min(1.0, avg_exec_time / (2 * avg_exec_time_overall)) * 0.2  # 20% weight to execution time
                    ]
                    bot_risk = sum(risk_components)

                # Define clear risk thresholds based on actual metrics
                risk_level = (
                    'HIGH RISK' if (failure_rate > 10 or success_rate < 85 or bot_risk >= 0.7) else
                    'MEDIUM RISK' if (failure_rate > 5 or success_rate < 95 or bot_risk >= 0.4) else
                    'LOW RISK'
                )
                bot_info = {
                    'id': row['Bot Name'],
                    'name': row['Bot Name'],  
                    'risk_level': risk_level,
                    'risk_score': round(bot_risk * 100, 1)
                }
                bots_list.append(bot_info)
                print(f"Processed bot: {bot_info}")  # Debug log
            except Exception as e:
                print(f"Error processing bot {row.get('Bot Name', 'unknown')}: {e}")
                continue
        
        # Calculate summary metrics
        try:
            summary = {
                'total_runs': int(df['Run Count'].sum()),
                'total_failures': int(df['Failure Count'].sum()),
                'global_success_rate': float(df['Success Rate (%)'].mean()),
                'bots_with_critical_priority': (
                    int(df[df['Priority'].str.lower().str.contains('critical', na=False)].shape[0])
                    if 'Priority' in df.columns else 0
                ),
                'bots': sorted(bots_list, key=lambda x: x['risk_score'], reverse=True)
            }
            
            # Validate metrics
            if summary['total_runs'] < summary['total_failures']:
                print("Warning: Correcting invalid failure count")
                summary['total_failures'] = summary['total_runs']
            
            summary['global_success_rate'] = max(0, min(100, summary['global_success_rate']))
            
            print(f"Final summary: {summary}")  # Debug log
            return jsonify({'summary': summary})
            
        except Exception as e:
            print(f"Error calculating summary metrics: {e}")
            return jsonify({'error': 'Error calculating summary metrics'}), 500
            
    except Exception as e:
        print(f"Unexpected error in summary endpoint: {e}")
        return jsonify({'error': str(e)}), 500
    try:
        summary = {
            'total_runs': int(df['Run Count'].sum()) if 'Run Count' in df.columns else 0,
            'total_failures': int(df['Failure Count'].sum()) if 'Failure Count' in df.columns else 0,
            'global_success_rate': float(df['Success Rate (%)'].mean()) if 'Success Rate (%)' in df.columns else 0.0,
            'bots_with_critical_priority': (
                int(df[df['Priority'].str.lower().str.contains('critical', na=False)].shape[0]) 
                if 'Priority' in df.columns else 0
            ),
            'bots': sorted(bots_list, key=lambda x: x['risk_score'], reverse=True)
        }
        
        # Validate data
        if summary['total_runs'] < summary['total_failures']:
            print("Warning: Total failures exceed total runs")  # Debug log
            summary['total_failures'] = summary['total_runs']  # Correct inconsistency
            
        if not 0 <= summary['global_success_rate'] <= 100:
            print(f"Warning: Invalid success rate {summary['global_success_rate']}")  # Debug log
            summary['global_success_rate'] = max(0, min(100, summary['global_success_rate']))  # Clamp to valid range
            
        print(f"Generated summary: {summary}")  # Debug log
        return jsonify({'summary': summary})
        
    except Exception as e:
        print(f"Error generating summary: {e}")  # Debug log
        return jsonify({
            'error': 'Failed to generate summary',
            'detail': str(e)
        }), 500

@app.route('/api/analytics/dashboard')
def analytics():
    df = DATA_DF.copy()
    
    # Initialize models on first request
    if not analytics_engine.models:
        try:
            processed_df = analytics_engine.load_and_process_data(df)
            analytics_engine.train_models(processed_df)
        except Exception as e:
            print(f"Error training models: {e}")
            # Continue without models if training fails
    
    try:
        # Calculate analytics
        processed_df = analytics_engine.load_and_process_data(df)
        analytics_data = analytics_engine.generate_analytics(processed_df)
        
        # Get unique users and ensure they are strings
        users = sorted([str(owner) for owner in df['Owner'].unique()]) if 'Owner' in df else []
        
        # Calculate per-user bot statistics with case-insensitive matching
        userBots = {}
        for user in users:
            # Use case-insensitive matching for Owner field
            user_mask = df['Owner'].str.lower() == user.lower()
            user_df = df[user_mask]
            userBots[user] = [{
                'name': row['Bot Name'],
                'total_runs': int(row['Run Count']),
                'success_rate': float(row['Success Rate (%)']),
                'avg_exec_time': float(row['Average Execution Time (s)']),
                'error_count': int(row['Failure Count'])
            } for _, row in user_df.iterrows()]
        
        # Get daily trends
        daily_trends = {
            'Run Count': {},
            'Success Rate (%)': {}
        }
        
        if 'Last Run Timestamp' in df.columns:
            df['date'] = pd.to_datetime(df['Last Run Timestamp']).dt.date
            for date, group in df.groupby('date'):
                date_str = date.strftime('%Y-%m-%d')
                daily_trends['Run Count'][date_str] = int(group['Run Count'].sum())
                daily_trends['Success Rate (%)'][date_str] = float(group['Success Rate (%)'].mean())
        
        response = {
            'total_runs': analytics_data['summary']['total_runs'],
            'success_rate': analytics_data['summary']['success_rate'],
            'avg_execution_time': analytics_data['summary']['avg_exec_time'],
            'total_errors': analytics_data['summary']['error_count'],
            'users': users,
            'userBots': userBots,
            'status_distribution': analytics_data['status_distribution'],
            'daily_trends': daily_trends,
            'risk_analysis': analytics_data['risk_analysis']['high_risk_bots'],
            'owner_insights': analytics_data['owner_insights']
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in analytics endpoint: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/analysis/<bot_id>')
def get_bot_analysis(bot_id):
    df = DATA_DF
    if df.empty:
        return jsonify({'error': 'No data available'}), 500
    
    try:
        matching_bots = df[df['Bot Name'] == bot_id]
        if matching_bots.empty:
            return jsonify({'error': f'Bot not found: {bot_id}'}), 404
        bot_data = matching_bots.iloc[0]
    except Exception as e:
        print(f"Error fetching bot data: {e}")
        return jsonify({'error': 'Internal server error'}), 500
        
    try:
        # Get required values with error handling
        run_count = int(bot_data.get('Run Count', 0))
        failure_count = int(bot_data.get('Failure Count', 0))
        success_rate = float(bot_data.get('Success Rate (%)', 0))
        avg_exec_time = float(bot_data.get('Average Execution Time (s)', 0))
        bot_type = str(bot_data.get('Bot Type', ''))
        owner = str(bot_data.get('Owner', ''))
        
        # Calculate metrics properly
        # Failure rate is the percentage of failed runs
        failure_rate = min(100.0, (failure_count / max(run_count, 1)) * 100)  
        
        # Success rate should be 100 - failure_rate
        success_rate = 100.0 - failure_rate
        
        # Calculate risk probability using Random Forest model if available
        if RISK_MODEL:
            try:
                # Prepare features
                features = pd.DataFrame([[
                    run_count,
                    failure_count,
                    success_rate,
                    avg_exec_time,
                    bot_type,
                    owner
                ]], columns=RISK_MODEL['numeric_cols'] + RISK_MODEL['categorical_cols'])
                
                # Get risk probability from model
                risk_probability = float(RISK_MODEL['model'].predict_proba(features)[0, 1])
            except Exception as e:
                print(f"Error using risk model: {e}")
                # Fallback to simple calculation if model fails
                risk_probability = min(1.0, failure_count / max(run_count, 1))
        else:
            # Fallback to simple calculation if no model
            risk_probability = min(1.0, failure_count / max(run_count, 1))
        
        # Recent metrics
        recent_runs = min(run_count, 37)  # Look at last 37 runs max
        recent_failures = int((failure_count / max(run_count, 1)) * recent_runs)
        
        try:
            # Perform anomaly detection using Isolation Forest and additional checks
            features = df[['Run Count', 'Failure Count', 'Success Rate (%)', 'Average Execution Time (s)']].copy()
            
            # Extract features for anomaly detection
            features_columns = ['Run Count', 'Failure Count', 'Success Rate (%)', 'Average Execution Time (s)']
            features = df[features_columns].copy()
            
            # Handle potential missing or infinite values
            features = features.fillna(features.mean())
            features = features.replace([np.inf, -np.inf], np.nan).fillna(features.mean())
            
            # Scale features using Robust scaling to handle outliers better
            from sklearn.preprocessing import RobustScaler
            scaler = RobustScaler()
            features_scaled = scaler.fit_transform(features)
            
            # Train Isolation Forest with optimized parameters
            iso_forest = IsolationForest(
                n_estimators=100,
                contamination=0.1,  # Expect only 10% of bots to be anomalous
                max_samples='auto',
                random_state=42
            )
            
            # Fit and predict anomalies
            anomaly_labels = iso_forest.fit_predict(features_scaled)
            anomaly_scores = iso_forest.score_samples(features_scaled)
            
            # Get the current bot's features
            bot_features = pd.DataFrame([[
                run_count,
                failure_count,
                success_rate,
                avg_exec_time
            ]], columns=features_columns)
            
            # Scale the current bot's features using the same scaler
            bot_features_scaled = scaler.transform(bot_features)
            
            # Get anomaly prediction and score for current bot
            bot_anomaly_label = iso_forest.predict(bot_features_scaled)[0]
            bot_anomaly_score = iso_forest.score_samples(bot_features_scaled)[0]
            
            # A bot is anomalous only if Isolation Forest explicitly identifies it
            is_anomaly = bot_anomaly_label == -1  # Isolation Forest uses -1 for anomalies
            
            # Calculate what percent of bots this one is more anomalous than
            percentile_rank = (anomaly_scores < bot_anomaly_score).mean() * 100
            
            # Only mark as warning if in the bottom 20% of scores but not an actual anomaly
            is_warning = percentile_rank < 20 and not is_anomaly
            
            # Calculate contribution of each feature to anomaly score
            feature_scores = {}
            mean_values = df[features_columns].mean()
            std_values = df[features_columns].std()
            
            for col in features_columns:
                z_score = abs((bot_features[col].iloc[0] - mean_values[col]) / std_values[col])
                feature_scores[col] = float(z_score)
            
            # Determine primary anomaly factors
            anomaly_factors = []
            for col, score in feature_scores.items():
                if score > 2:  # More than 2 standard deviations from mean
                    factor_name = col.replace('_', ' ').lower()
                    if score > 3:
                        anomaly_factors.append(f"severely abnormal {factor_name}")
                    else:
                        anomaly_factors.append(f"unusual {factor_name}")
            
            # Calculate normalized score (0-1 range) from percentile rank
            normalized_score = 1 - (percentile_rank / 100)
            
            # Calculate combined risk score
            risk_score = (normalized_score * 0.6) + (risk_probability * 0.4)
            
            # Update risk probability with anomaly influence
            risk_probability = risk_score
            
        except Exception as e:
            print(f"Error in anomaly detection: {str(e)}")
            # Provide default values if anomaly detection fails
            is_anomaly = False
            is_warning = False
            normalized_score = 0.0
            percentile_rank = 100
        
        # Add anomaly-specific recommendations only for true anomalies
        # As identified by Isolation Forest
        recommendations = []
        
        # Generate focused, data-driven recommendations based on statistical analysis
        recommendations = []
        
        # Calculate failure metrics
        failure_ratio = min(1.0, failure_count / max(run_count, 1))  # Ensure failure rate never exceeds 100%
        avg_failure_count = df['Failure Count'].mean()
        avg_failure_rate = min(1.0, df['Failure Count'].sum() / max(df['Run Count'].sum(), 1))
        failure_count_std = df['Failure Count'].std()

        # Determine failure severity using both relative and absolute metrics
        relative_severity = (failure_ratio - avg_failure_rate) / max(avg_failure_rate, 0.01)
        absolute_severity = (failure_count - avg_failure_count) / max(failure_count_std, 1)
        
        # Priority 1: Failure Analysis
        if failure_ratio >= 0.7 or absolute_severity > 2:
            recommendations.append(
                f"Critical failure rate ({round(failure_ratio * 100)}%) with {failure_count} failures - "
                f"Immediate investigation required"
            )
        elif failure_ratio >= 0.4 or absolute_severity > 1:
            recommendations.append(
                f"Moderate failure rate ({round(failure_ratio * 100)}% of runs failed) with {failure_count} failures - "
                f"Review error patterns and recovery procedures"
            )
        elif failure_ratio >= 0.2:
            recommendations.append(
                f"Elevated failure rate ({round(failure_ratio * 100)}%) detected - Monitor error patterns"
            )

        # Priority 2: Activity Pattern Analysis
        avg_runs = df['Run Count'].mean()
        run_count_std = df['Run Count'].std()
        run_zscore = (run_count - avg_runs) / max(run_count_std, 1)
        
        if abs(run_zscore) > 2:
            run_diff_percent = ((run_count - avg_runs) / max(avg_runs, 1) * 100)
            if run_count < avg_runs:
                recommendations.append(
                    f"Significantly low activity detected ({abs(round(run_diff_percent))}% below average, {run_count} runs) - "
                    f"Verify bot scheduling and triggers"
                )
            else:
                recommendations.append(
                    f"Unusually high activity detected ({round(run_diff_percent)}% above average, {run_count} runs) - "
                    f"Review workload distribution"
                )

        # Priority 3: Performance Analysis
        if 'Average Execution Time (s)' in df.columns:
            exec_time_baseline = df['Average Execution Time (s)'].mean()
            exec_time_std = df['Average Execution Time (s)'].std()
            exec_time_zscore = (avg_exec_time - exec_time_baseline) / max(exec_time_std, 0.1)
            
            if abs(exec_time_zscore) > 2:
                exec_time_increase = ((avg_exec_time - exec_time_baseline) / max(exec_time_baseline, 0.1) * 100)
                if exec_time_increase > 0:
                    recommendations.append(
                        f"Performance degradation detected ({round(exec_time_increase)}% slower than average) - "
                        f"Investigate bottlenecks"
                    )
                else:
                    recommendations.append(
                        f"Unusual performance pattern ({abs(round(exec_time_increase))}% faster than average) - "
                        f"Validate process completion"
                    )

        # Add only the most critical anomaly-based recommendation if needed
        if is_anomaly and len(recommendations) < 3:  # Only add if we have space for more critical recommendations
            critical_factors = []
            
            # Check for the most severe anomalies
            if 'execution time' in ' '.join(anomaly_factors):
                exec_time_zscore = (avg_exec_time - df['Average Execution Time (s)'].mean()) / max(df['Average Execution Time (s)'].std(), 0.1)
                if abs(exec_time_zscore) > 3:
                    critical_factors.append('performance')

            if 'failure' in ' '.join(anomaly_factors):
                failure_zscore = (failure_count - df['Failure Count'].mean()) / max(df['Failure Count'].std(), 0.1)
                if abs(failure_zscore) > 3:
                    critical_factors.append('failure patterns')

            # Add only if truly critical anomalies found
            if critical_factors:
                recommendations.append(
                    f"CRITICAL: Anomalous behavior detected in {' and '.join(critical_factors)} - Immediate investigation required"
                )

        # Add general recommendations based on risk score
        if risk_probability > 0.8:
            impact_factors = [k for k, v in feature_scores.items() if v > 1.5]
            if impact_factors:
                recommendations.append(
                    f"High risk detected in: {', '.join(impact_factors)} - "
                    f"Consider temporary suspension for thorough investigation"
                )

        # If no specific recommendations were generated, add general ones
        if not recommendations:
            recommendations.extend([
                "Monitor performance metrics and error patterns",
                "Schedule routine maintenance and code review",
                "Consider implementing automated testing and validation"
            ])
        
        if is_anomaly:
            recommendations.extend([
                'Investigate unusual behavior patterns detected by anomaly detection',
                'Compare current metrics with historical baselines',
                'Review system resources and dependencies'
            ])
        
        if is_anomaly:
            anomaly_factors = []
            bot_values = features.loc[matching_bots.index[0]]
            mean_values = features.mean()
            std_values = features.std()
            
            # Check which metrics are contributing to the anomaly
            if abs(bot_values['Run Count'] - mean_values['Run Count']) > 2 * std_values['Run Count']:
                anomaly_factors.append('unusual number of runs')
            if abs(bot_values['Failure Count'] - mean_values['Failure Count']) > 2 * std_values['Failure Count']:
                anomaly_factors.append('abnormal failure count')
            if abs(bot_values['Success Rate (%)'] - mean_values['Success Rate (%)']) > 2 * std_values['Success Rate (%)']:
                anomaly_factors.append('unusual success rate')
            if abs(bot_values['Average Execution Time (s)'] - mean_values['Average Execution Time (s)']) > 2 * std_values['Average Execution Time (s)']:
                anomaly_factors.append('irregular execution time')
            
            recommendations.extend([
                f'Investigate anomalous behavior: {", ".join(anomaly_factors)}',
                'Consider performing detailed performance analysis',
                'Review bot configuration and resource allocation'
            ])
        
            # Prepare detailed analysis with consistent metrics
        status = "NORMAL"
        if is_anomaly:
            status = "CRITICAL ANOMALY"
        elif is_warning:
            status = "POTENTIAL ANOMALY"
        elif failure_rate > 10 or success_rate < 85:
            status = "HIGH RISK"
        elif failure_rate > 5 or success_rate < 95:
            status = "MEDIUM RISK"
            
        # Determine key contributing factors based on actual metrics
        contributing_factors = []
        if failure_count == 0:
            contributing_factors.append(f"No failures detected")
        else:
            contributing_factors.append(
                f"{'High' if failure_rate > 10 else 'Moderate' if failure_rate > 5 else 'Low'} "
                f"failure rate ({round(failure_rate, 1)}% of runs failed)"
            )
            contributing_factors.append(
                f"{'High' if failure_count > 10 else 'Moderate' if failure_count > 5 else 'Low'} "
                f"absolute failure count ({failure_count} failures)"
            )
            
        anomaly_detail = {
            'status': status,
            'score': round(100 - percentile_rank, 1),
            'percentile': round(percentile_rank, 1),
            'factors': contributing_factors,
            'feature_impacts': {
                'Failure Rate': round(failure_rate, 1),
                'Success Rate': round(success_rate, 1),
                'Execution Time (s)': round(avg_exec_time, 1),
                'Total Failures': failure_count
            }
        }
        
        analysis = {
            'risk_probability': float(risk_probability),
            'failure_rate': round(float(failure_rate), 1),
            'recent_failures': int(recent_failures),
            'recent_runs': int(recent_runs),
            'success_rate': float(success_rate),
            'anomaly_analysis': anomaly_detail,
            'is_anomalous': bool(is_anomaly),
            'anomaly_score': float(normalized_score),
            'recommendations': recommendations,
            'metric_impacts': {
                'failure_rate_impact': round(feature_scores.get('Failure Count', 0) * 100 / 4, 1),
                'success_rate_impact': round(feature_scores.get('Success Rate (%)', 0) * 100 / 4, 1),
                'execution_time_impact': round(feature_scores.get('Average Execution Time (s)', 0) * 100 / 4, 1),
                'run_count_impact': round(feature_scores.get('Run Count', 0) * 100 / 4, 1)
            }
        }
        
        return jsonify(analysis)
    except Exception as e:
        print(f"Error calculating analysis: {e}")
        return jsonify({'error': 'Error calculating analysis'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

# Analyze and process bots