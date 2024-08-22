# Large Music Collection Visualisation
Procedurally Generated Navigable Environment Based on Extracted Features from Music Collections’ aimed to create a unique way for users to interact with and listen to their music collections. A user can log in using their spotify account and the application will receive their music collection. A Convolutional Neural Network (CNN) is used for genre classification and Principal Component Analysis (PCA) is used to reduce the dimensionality of extracted features onto a 2-dimensional space. Web technologies such as HTML, CSS and JavaScript are used to render and display an environment for a user to enjoy


## Project Structure

- `models/`: Contains Python files and machine learning models
  - `tempMP3Files/`: Temporarly store mp3 files
  - 'genreModel.h5': CNN model used for genre classification
  - 'getGenre.py': The Python file that handles genre classification and PCA analysis
  - 'getGenre.log': A log file for errors on the python script

- `public/`: Stores static assets
  - `images/`: Image files used in the project
 
- `style/`: Contains frontend assets
  - `script.js`: Main javascript file for dashboard page
  - `SceneSetup.js`: Sets up the scene using Three.js
  - `PlanetSetup.js`: Sets up the planet objects using Three.js
  - `style.css`: The CSS file for both index and dashboard
    
- `views/`: EJS template files
  - `index.ejs`: Log in page 
  - `dashboard.ejs`: Dashboard page to display universe
    
- `server.js`: Main entry point for the Node.js server

## Prerequisites
- Node.js
- Python (for machine learning models)

## Installation
1. Clone the repository:
2. Install Node.js dependencies:
3. Install Python dependencies (if applicable):


## Run Application
To run the application simply go to the root directory and run the command: npm run start
open a web browser and navigate to the appropriate page to use application
