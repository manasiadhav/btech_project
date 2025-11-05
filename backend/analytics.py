import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib

class AnalyticsEngine:
    def __init__(self):
        self.models = None
        self.risk_threshold = 0.5

    def load_and_process_data(self, df):
        """Process the dataframe and add derived metrics"""
        df = df.copy()
        df["Last Run Timestamp"] = pd.to_datetime(df["Last Run Timestamp"], errors="coerce")
        df["DayOfWeek"] = df["Last Run Timestamp"].dt.day_name()
        df["Failure Rate (%)"] = (df["Failure Count"] / df["Run Count"]) * 100
        df["Efficiency_Score"] = df["Success Rate (%)"] / df["Average Execution Time (s)"]
        return df

    def train_models(self, df):
        """Train risk and anomaly detection models"""
        model_df = df.dropna(subset=[
            "Run Count", "Failure Count", "Success Rate (%)",
            "Average Execution Time (s)", "Bot Type", "Owner"
        ])
        
        model_df["High_Failure_Risk"] = (model_df["Failure Rate (%)"] > 20).astype(int)

        feature_columns_numeric = [
            "Run Count", "Failure Count", "Success Rate (%)", "Average Execution Time (s)"
        ]
        feature_columns_categorical = ["Bot Type", "Owner"]

        X = model_df[feature_columns_numeric + feature_columns_categorical]
        y = model_df["High_Failure_Risk"]

        preprocessor = ColumnTransformer(transformers=[
            ("num", StandardScaler(), feature_columns_numeric),
            ("cat", OneHotEncoder(handle_unknown="ignore"), feature_columns_categorical)
        ])

        clf = Pipeline(steps=[
            ("preprocess", preprocessor),
            ("model", RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced"))
        ])

        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)
        clf.fit(X_train, y_train)
        
        val_proba = clf.predict_proba(X_val)[:, 1]
        val_pred = (val_proba >= 0.5).astype(int)
        kpi_accuracy = float(accuracy_score(y_val, val_pred))
        kpi_auc = float(roc_auc_score(y_val, val_proba))

        clf.fit(X, y)

        iso = IsolationForest(n_estimators=300, contamination=0.05, random_state=42)
        iso.fit(model_df[feature_columns_numeric].fillna(0))

        self.models = {
            "classifier": clf,
            "isolation_forest": iso,
            "feature_columns_numeric": feature_columns_numeric,
            "feature_columns_categorical": feature_columns_categorical,
            "kpi_accuracy": kpi_accuracy,
            "kpi_auc": kpi_auc
        }

        return self.models

    def compute_predictions(self, df):
        """Compute risk probabilities and anomaly detection"""
        if not self.models:
            return df
            
        enriched = df.copy()
        num_cols = self.models["feature_columns_numeric"]
        cat_cols = self.models["feature_columns_categorical"]
        
        X_all = enriched[num_cols + cat_cols].copy()
        # Get Random Forest prediction probability
        rf_proba = self.models["classifier"].predict_proba(X_all)[:, 1]
        
        # Calculate direct risk factors
        failure_rate = enriched["Failure Count"] / enriched["Run Count"].clip(lower=1)
        success_impact = (100 - enriched["Success Rate (%)"]) / 100
        
        # Combine multiple risk factors
        enriched["Risk_Prob"] = (
            rf_proba * 0.4 +  # Random Forest prediction (40% weight)
            failure_rate * 0.3 +  # Current failure rate (30% weight)
            success_impact * 0.3  # Success rate impact (30% weight)
        )
        
        # Clip to ensure probabilities stay in [0,1] range
        enriched["Risk_Prob"] = enriched["Risk_Prob"].clip(0, 1)
        
        iso_input = enriched[num_cols].fillna(0)
        iso_pred = self.models["isolation_forest"].predict(iso_input)
        enriched["Anomaly_Status"] = np.where(iso_pred == -1, "Anomaly", "Normal")
        
        enriched["Will_Fail_Soon"] = (enriched["Risk_Prob"] >= self.risk_threshold).astype(int)
        
        return enriched

    def generate_analytics(self, df):
        """Generate complete analytics data"""
        processed_df = self.compute_predictions(df)
        
        # Ensure Owner column values are strings
        processed_df['Owner'] = processed_df['Owner'].astype(str)
        
        analytics = {
            "summary": {
                "total_runs": int(processed_df["Run Count"].sum()),
                "success_rate": float(processed_df["Success Rate (%)"].mean()),
                "avg_exec_time": float(processed_df["Average Execution Time (s)"].mean()),
                "error_count": int((processed_df["Failure Count"] > 0).sum()),
                "most_active_owner": str(processed_df["Owner"].value_counts().idxmax()),
                "high_failure_bots": int(len(processed_df[processed_df["Failure Rate (%)"] > 20])),
                "total_bots": len(processed_df)
            },
            "status_distribution": processed_df["Last Status"].value_counts().to_dict(),
            "daily_trends": processed_df.groupby("DayOfWeek").agg({
                "Run Count": "sum",
                "Success Rate (%)": "mean"
            }).to_dict(),
            "owner_insights": processed_df.groupby("Owner").agg({
                "Bot Name": "count",
                "Failure Count": "sum",
                "Run Count": "sum",
                "Success Rate (%)": "mean"
            }).to_dict(),
            "risk_analysis": {
                "high_risk_bots": processed_df[["Bot Name", "Owner", "Risk_Prob"]].sort_values("Risk_Prob", ascending=False).to_dict('records'),
                "anomalies": processed_df[processed_df["Anomaly_Status"] == "Anomaly"][["Bot Name", "Owner"]].to_dict('records')
            },
            "ml_metrics": {
                "accuracy": self.models["kpi_accuracy"] if self.models else None,
                "auc": self.models["kpi_auc"] if self.models else None
            }
        }
        
        return analytics