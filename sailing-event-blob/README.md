# Sailing Event Blob Storage

This project is designed to manage a sailing event application utilizing Blob storage for handling data across various routes. The application allows for uploading, downloading, and deleting files related to race results, schedules, and other relevant data.

## Project Structure

- **src/**: Contains the main application code.
  - **app/**: The main application routes and components.
    - **api/**: API routes for handling requests.
      - **blob/**: Routes for managing blob storage operations.
        - **upload/**: Handles file uploads to blob storage.
        - **download/**: Manages file downloads from blob storage.
        - **delete/**: Handles file deletions from blob storage.
      - **results/**: Manages race results.
      - **schedule/**: Manages race schedules.
      - **knockouts/**: Manages knockout matches.
      - **settings/**: Manages application settings.
      - **leaderboard/**: Manages leaderboard data.
      - **metrics/**: Manages application metrics.
      - **race/**: Manages race operations.
  - **components/**: Contains React components for the application.
  - **lib/**: Contains utility functions and classes for interacting with blob storage.
  - **types/**: Type definitions for various data structures used in the application.
  - **utils/**: Utility functions for calculations and validations.
- **config/**: Configuration settings for connecting to blob storage.
- **package.json**: NPM configuration file.
- **tsconfig.json**: TypeScript configuration file.
- **next.config.js**: Next.js configuration file.
- **.env.local**: Environment variables for local development.

## Features

- **Blob Storage Integration**: Seamlessly upload, download, and delete files using Blob storage.
- **Race Management**: Manage race results, schedules, and knockout matches effectively.
- **Dynamic Components**: Utilize React components for a responsive user interface.
- **Type Safety**: Leverage TypeScript for type safety and better development experience.

## Getting Started

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up your environment variables in the `.env.local` file.
4. Run the application using `npm run dev`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.