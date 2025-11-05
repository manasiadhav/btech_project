import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score
import joblib

# --- Load dataset ---
import os
data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'RPA_Bot_Data_Synthetic_800_Rows.csv')
df = pd.read_csv(data_path)

# --- Feature Engineering ---
df["Failure Rate (%)"] = (df["Failure Count"] / df["Run Count"]) * 100
df["High_Failure_Risk"] = (df["Failure Rate (%)"] > 20).astype(int)

# --- Define features ---
feature_columns_numeric = [
    "Run Count",
    "Failure Count",
    "Success Rate (%)",
    "Average Execution Time (s)"
]
feature_columns_categorical = ["Bot Type", "Owner"]

X = df[feature_columns_numeric + feature_columns_categorical]
y = df["High_Failure_Risk"]

# --- Preprocessing ---
preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), feature_columns_numeric),
        ("cat", OneHotEncoder(handle_unknown="ignore"), feature_columns_categorical),
    ]
)

# --- Define Random Forest Pipeline ---
clf = Pipeline(
    steps=[
        ("preprocess", preprocessor),
        ("model", RandomForestClassifier(
            n_estimators=300,
            random_state=42,
            class_weight="balanced"
        )),
    ]
)

# --- Train-Test Split ---
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.25, stratify=y, random_state=42
)

# --- Train Model ---
clf.fit(X_train, y_train)

# --- Evaluate Model ---
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tabulate import tabulate

# Get predictions
val_proba = clf.predict_proba(X_val)[:, 1]
val_pred = (val_proba >= 0.5).astype(int)

# Calculate metrics
accuracy = accuracy_score(y_val, val_pred)
precision = precision_score(y_val, val_pred)
recall = recall_score(y_val, val_pred)
f1 = f1_score(y_val, val_pred)
auc = roc_auc_score(y_val, val_proba)

# Create confusion matrix
cm = confusion_matrix(y_val, val_pred)
tn, fp, fn, tp = cm.ravel()

# Calculate additional metrics
specificity = tn / (tn + fp)
npv = tn / (tn + fn)  # Negative Predictive Value

# Create metrics table
metrics_table = [
    ["Metric", "Score"],
    ["Accuracy", f"{accuracy:.3f}"],
    ["Precision", f"{precision:.3f}"],
    ["Recall (Sensitivity)", f"{recall:.3f}"],
    ["Specificity", f"{specificity:.3f}"],
    ["F1 Score", f"{f1:.3f}"],
    ["ROC-AUC", f"{auc:.3f}"],
    ["Negative Predictive Value", f"{npv:.3f}"]
]

# Create confusion matrix table
conf_matrix_table = [
    ["", "Predicted Negative", "Predicted Positive"],
    ["Actual Negative", str(tn), str(fp)],
    ["Actual Positive", str(fn), str(tp)]
]

print("\n=== Model Evaluation Metrics ===")
print(tabulate(metrics_table, headers="firstrow", tablefmt="grid"))

print("\n=== Confusion Matrix ===")
print(tabulate(conf_matrix_table, headers="firstrow", tablefmt="grid"))

# Per-class metrics table
class_metrics_table = [
    ["Class", "Precision", "Recall", "F1-Score", "Support"],
    ["Low Risk (0)", f"{precision_score(y_val, val_pred, pos_label=0):.3f}", 
     f"{recall_score(y_val, val_pred, pos_label=0):.3f}", 
     f"{f1_score(y_val, val_pred, pos_label=0):.3f}", 
     str((y_val == 0).sum())],
    ["High Risk (1)", f"{precision_score(y_val, val_pred, pos_label=1):.3f}", 
     f"{recall_score(y_val, val_pred, pos_label=1):.3f}", 
     f"{f1_score(y_val, val_pred, pos_label=1):.3f}", 
     str((y_val == 1).sum())]
]

print("\n=== Per-Class Metrics ===")
print(tabulate(class_metrics_table, headers="firstrow", tablefmt="grid"))

# Print feature importance
feature_importance = pd.DataFrame({
    'feature': feature_columns_numeric + [f"{col}_{val}" for col, vals in 
                                        preprocessor.named_transformers_['cat'].get_feature_names_out(feature_columns_categorical) for val in vals.split('_')],
    'importance': clf.named_steps['model'].feature_importances_
})
feature_importance = feature_importance.sort_values('importance', ascending=False)

print("\n=== Top 10 Feature Importance ===")
print(tabulate(feature_importance.head(10), headers="keys", tablefmt="grid", floatfmt=".3f"))

# --- Retrain on Full Dataset for Deployment ---
clf.fit(X, y)

# --- Save Model ---
joblib.dump({
    "model": clf,
    "numeric_cols": feature_columns_numeric,
    "categorical_cols": feature_columns_categorical
}, "bot_failure_risk_model.pkl")

print("✅ Model trained and saved as 'bot_failure_risk_model.pkl'")
