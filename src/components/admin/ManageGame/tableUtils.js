/**
 * Get paginated rows from the provided data
 * @param {Array} rows - All table rows
 * @param {number} currentPage - Current page number
 * @param {number} itemsPerPage - Items per page
 * @returns {Array} Paginated rows
 */
export const getPaginatedRows = (rows, currentPage, itemsPerPage) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return rows.slice(startIndex, endIndex);
  };
  
  /**
   * Calculate total pages based on row count and items per page
   * @param {number} rowCount - Total number of rows
   * @param {number} itemsPerPage - Items per page
   * @returns {number} Total number of pages
   */
  export const calculateTotalPages = (rowCount, itemsPerPage) => {
    return Math.ceil(rowCount / itemsPerPage);
  };