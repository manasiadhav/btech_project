from sklearn.ensemble import IsolationForest
import numpy as np
import pandas as pd

class AnomalyDetector:
    def __init__(self, contamination=0.1):
        """Initialize anomaly detector with IsolationForest.
        
        Args:
            contamination (float): Expected proportion of outliers in the data.
                                Default is 0.1 (10% anomalies)
        """
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42
        )
        self.feature_columns = [
            'Success Rate (%)',
            'Average Execution Time (s)',
            'Run Count',
            'Failure Count'
        ]

    def fit(self, data):
        """Train the anomaly detection model.
        
        Args:
            data (pd.DataFrame): Training data with required feature columns
        """
        features = self._extract_features(data)
        self.model.fit(features)
        
    def predict(self, data):
        """Predict anomalies in new data.
        
        Args:
            data (pd.DataFrame): Data to analyze for anomalies
            
        Returns:
            dict: Contains anomaly flags and scores for each bot
        """
        features = self._extract_features(data)
        
        # Get anomaly flags (-1 for anomaly, 1 for normal)
        flags = self.model.predict(features)
        
        # Get anomaly scores (negative = more anomalous)
        scores = self.model.score_samples(features)
        
        # Normalize scores to 0-1 range (1 = most anomalous)
        normalized_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min())
        
        results = []
        for i, (flag, score) in enumerate(zip(flags, normalized_scores)):
            results.append({
                'bot_name': data.iloc[i]['Bot Name'],
                'is_anomaly': flag == -1,
                'anomaly_score': float(score),
                'features_analyzed': {
                    col: float(data.iloc[i][col])
                    for col in self.feature_columns
                }
            })
            
        return results

    def _extract_features(self, data):
        """Extract and normalize features for anomaly detection."""
        # Ensure all required columns exist
        missing_cols = [col for col in self.feature_columns if col not in data.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
            
        # Extract features
        features = data[self.feature_columns].copy()
        
        # Handle missing values
        features = features.fillna(features.mean())
        
        # Normalize features
        for col in features.columns:
            mean = features[col].mean()
            std = features[col].std()
            if std > 0:
                features[col] = (features[col] - mean) / std
                
        return features
