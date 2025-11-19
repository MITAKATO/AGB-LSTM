# AGB-LSTM: Soybean Yield Estimation Framework

This repository contains the source code for the paper: **"Estimating Soybean Yields from High-Temporal-Resolution Multi-Source Data Using Deep Learning"**.

It implements the **AGB-LSTM** model, a hybrid deep learning architecture integrating **Graph Isomorphism Networks (GIN)**, **Attention Mechanisms**, and **Bi-directional LSTMs**. The framework is designed to predict county-level soybean yields using high-frequency remote sensing time-series data (Sentinel-2, MODIS) and environmental variables.

## 📂 Repository Content

This repository is organized into two core scripts that handle the entire workflow from data acquisition to model evaluation:

* **`Data.js`**: A Google Earth Engine (GEE) script responsible for preprocessing satellite imagery (Sentinel-2, MODIS), fusing multi-source environmental data (GLDAS, CHIRPS), and exporting the time-series features as CSV files.
* **`AGB-LSTM.ipynb`**: The main Jupyter Notebook containing the complete deep learning pipeline. It includes data loading, graph construction (adjacency matrix), model architecture definition (GIN+Attention+BiLSTM), hyperparameter optimization (Optuna), training, and validation.

## 🛠️ Dependencies

To ensure reproducibility, we recommend using **Python 3.8+** with the specific library versions listed below.

You can install all dependencies using the following command:

```bash
pip install tensorflow==2.13.0 spektral==1.3.1 pandas==2.0.3 numpy==1.24.3 scikit-learn==1.3.2 matplotlib==3.7.5 optuna==3.6.1
```

**Key Libraries Used:**
* **TensorFlow/Keras (v2.13.0)**: For building and training the deep learning model.
* **Spektral (v1.3.1)**: For the Graph Neural Network (GINConv) implementation. *Note: Compatible with TF 2.x.*
* **Optuna (v3.6.1)**: For automated hyperparameter tuning.
* **Numpy (v1.24.3)**: Locked to version < 2.0 to ensure compatibility with TensorFlow.
* **Scikit-learn (v1.3.2)**: For data scaling and metric calculation.

## 🚀 Usage Instructions

### Step 1: Data Acquisition (Google Earth Engine)
1.  Open the **[Google Earth Engine Code Editor](https://code.earthengine.google.com/)**.
2.  Copy the contents of **`Data.js`** into the editor.
3.  **Configuration**:
    * Replace the `roi` variable with your Region of Interest (ROI) asset path.
    * Ensure the crop mask (USDA CDL) asset path is correct.
4.  **Run**: Execute the script. It will calculate 5-day composite features (NDVI, EVI, NIRv, SIF, GPP, etc.) and export CSV files (e.g., `IOWA_Adair2019.csv`) to your Google Drive.
5.  **Prepare Data**: Download the CSVs and organize them into training and testing files (e.g., named `6.25~8.24 train.csv` and `6.25~8.24 test.csv` as expected by the python script).

### Step 2: Model Training & Evaluation
1.  Ensure the training and testing CSV files are in the same directory as **`AGB-LSTM.ipynb`**.
2.  Open the notebook and execute the cells sequentially.
3.  **Workflow**:
    * **Data Processing**: The notebook loads CSV data and constructs the feature graph.
    * **Hyperparameter Tuning**: It runs `Optuna` trials to find the best configuration (Hidden units, Learning rate, etc.).
    * **Training**: The model is trained using the optimal hyperparameters. *Note: The script will automatically create `models/` and `history/` folders to save weights and logs.*
    * **Evaluation**: Generates performance metrics (R², RMSE, MAPE) and visualizes prediction results via scatter plots.

## 🧠 Model Architecture

The `AGB-LSTM.ipynb` file contains the complete class definition of the custom model:

```python
# High-level structure
1. GIN Layer: Extracts feature correlations using graph convolution.
2. Cross-Attention: Weighs the interaction between raw inputs and graph features.
3. Bi-LSTM Layers: Captures bidirectional temporal dependencies.
4. Self-Attention: Focuses on critical time steps in the sequence.
5. Regression Head: Outputs the final yield prediction.
```

## 📜 License
This project is open-sourced under the MIT License.