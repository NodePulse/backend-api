import { param, query } from 'express-validator';

export const getAllEventsValidator = [
  // Validate pagination parameters
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limit must be a positive integer.'),
  
  // Validate search and filter parameters
  query('search')
    .optional()
    .isString()
    .trim()
    .withMessage('Search query must be a string.'),
  query('category')
    .optional()
    .isString()
    .trim()
    .withMessage('Category must be a string.'),
    
  // Validate status parameter to be one of the allowed values
  query('status')
    .optional()
    .isIn(['upcoming', 'ongoing', 'completed'])
    .withMessage('Status must be one of: upcoming, ongoing, completed.'),
];

export const getEventByIdValidator = [
  param('id')
    .isString()
    .withMessage('Event ID must be a string.')
    .notEmpty()
    .withMessage('Event ID cannot be empty.'),
];