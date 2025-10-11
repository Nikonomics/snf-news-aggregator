import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Calculate composite score for a state based on multiple weighted metrics
 *
 * Formula breakdown:
 * - Labor Cost Index (25%): Lower wages + staffing requirements = better
 * - Reimbursement Index (25%): Higher Medicaid/Medicare rates = better
 * - Profitability Ratio (20%): Reimbursement / (Wages * Staffing) = better
 * - Market Opportunity (20%):
 *     • Senior pop growth (10%)
 *     • Beds per 1K seniors - INVERSE (10%): LOWER = better (less saturated)
 * - Quality Environment (10%): Star rating + regulatory burden
 */

// National averages (calculated from all 50 states in our dataset)
const NATIONAL_AVG = {
  medicaidRate: 242.5,
  avgRNWage: 36.8,
  avgCNAWage: 16.2,
  occupancyRate: 78.5,
  avgStarRating: 3.5,
  seniorPopGrowth: 2.1,
  bedsPerThousandSeniors: 28.5,
  staffingRequirement: 3.5
}

/**
 * Normalize a value to 0-100 scale
 * @param {number} value - The value to normalize
 * @param {number} min - Minimum value in dataset
 * @param {number} max - Maximum value in dataset
 * @param {boolean} inverse - If true, lower is better (reverse scale)
 */
function normalize(value, min, max, inverse = false) {
  if (max === min) return 50 // If all values are the same, return middle score
  const normalized = ((value - min) / (max - min)) * 100
  return inverse ? 100 - normalized : normalized
}

/**
 * Calculate Labor Cost Index (25% weight)
 * Lower labor costs + lower staffing requirements = better score
 */
function calculateLaborIndex(state, allStates) {
  // Calculate blended wage (weighted by typical staff mix)
  const blendedWage = (state.avgRNWage * 0.3) + (state.avgCNAWage * 0.7)

  // Get min/max for normalization
  const blendedWages = allStates.map(s => (s.avgRNWage * 0.3) + (s.avgCNAWage * 0.7))
  const minWage = Math.min(...blendedWages)
  const maxWage = Math.max(...blendedWages)

  const staffReqs = allStates.map(s => s.staffingRequirement)
  const minStaff = Math.min(...staffReqs)
  const maxStaff = Math.max(...staffReqs)

  // Lower wages and lower staffing requirements = better (inverse = true)
  const wageScore = normalize(blendedWage, minWage, maxWage, true)
  const staffScore = normalize(state.staffingRequirement, minStaff, maxStaff, true)

  return (wageScore * 0.6) + (staffScore * 0.4) // Wages weighted slightly more
}

/**
 * Calculate Reimbursement Index (25% weight)
 * Higher Medicaid rates = better score
 */
function calculateReimbursementIndex(state, allStates) {
  const rates = allStates.map(s => s.medicaidRate)
  const minRate = Math.min(...rates)
  const maxRate = Math.max(...rates)

  return normalize(state.medicaidRate, minRate, maxRate)
}

/**
 * Calculate Profitability Ratio (20% weight)
 * Reimbursement / (Wages * Staffing) = profitability metric
 */
function calculateProfitabilityRatio(state, allStates) {
  // Calculate profitability ratio for all states
  const ratios = allStates.map(s => {
    const blendedWage = (s.avgRNWage * 0.3) + (s.avgCNAWage * 0.7)
    return s.medicaidRate / (blendedWage * s.staffingRequirement)
  })

  const blendedWage = (state.avgRNWage * 0.3) + (state.avgCNAWage * 0.7)
  const ratio = state.medicaidRate / (blendedWage * state.staffingRequirement)

  const minRatio = Math.min(...ratios)
  const maxRatio = Math.max(...ratios)

  return normalize(ratio, minRatio, maxRatio)
}

/**
 * Calculate Market Opportunity Score (20% weight)
 * Senior population growth + supply/demand balance
 */
function calculateMarketOpportunity(state, allStates) {
  // Senior population growth (higher = better)
  const growthRates = allStates.map(s => s.seniorPopGrowth)
  const minGrowth = Math.min(...growthRates)
  const maxGrowth = Math.max(...growthRates)
  const growthScore = normalize(state.seniorPopGrowth, minGrowth, maxGrowth)

  // Beds per 1K seniors (LOWER = better, less saturated market)
  const bedRatios = allStates.map(s => s.bedsPerThousandSeniors)
  const minBeds = Math.min(...bedRatios)
  const maxBeds = Math.max(...bedRatios)
  const supplyScore = normalize(state.bedsPerThousandSeniors, minBeds, maxBeds, true)

  return (growthScore * 0.5) + (supplyScore * 0.5)
}

/**
 * Calculate Quality Environment Score (10% weight)
 * Star ratings + occupancy rate
 */
function calculateQualityEnvironment(state, allStates) {
  // Star ratings (higher = better regulatory environment)
  const ratings = allStates.map(s => s.avgStarRating)
  const minRating = Math.min(...ratings)
  const maxRating = Math.max(...ratings)
  const ratingScore = normalize(state.avgStarRating, minRating, maxRating)

  // Occupancy rate (higher = better market health)
  const occupancies = allStates.map(s => s.occupancyRate)
  const minOcc = Math.min(...occupancies)
  const maxOcc = Math.max(...occupancies)
  const occScore = normalize(state.occupancyRate, minOcc, maxOcc)

  return (ratingScore * 0.5) + (occScore * 0.5)
}

/**
 * Calculate overall composite score for a state
 */
export function calculateStateScore(state, allStates) {
  const laborIndex = calculateLaborIndex(state, allStates)
  const reimbursementIndex = calculateReimbursementIndex(state, allStates)
  const profitabilityRatio = calculateProfitabilityRatio(state, allStates)
  const marketOpportunity = calculateMarketOpportunity(state, allStates)
  const qualityEnvironment = calculateQualityEnvironment(state, allStates)

  // Weighted composite score
  const overallScore =
    (laborIndex * 0.25) +
    (reimbursementIndex * 0.25) +
    (profitabilityRatio * 0.20) +
    (marketOpportunity * 0.20) +
    (qualityEnvironment * 0.10)

  return {
    overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
    components: {
      laborIndex: Math.round(laborIndex * 10) / 10,
      reimbursementIndex: Math.round(reimbursementIndex * 10) / 10,
      profitabilityRatio: Math.round(profitabilityRatio * 10) / 10,
      marketOpportunity: Math.round(marketOpportunity * 10) / 10,
      qualityEnvironment: Math.round(qualityEnvironment * 10) / 10
    }
  }
}

/**
 * Get color code based on score (0-100)
 */
export function getColorForScore(score) {
  if (score >= 67) return 'green'
  if (score >= 34) return 'yellow'
  return 'red'
}

/**
 * Load and score all states
 */
export function getStatesWithScores() {
  try {
    // Load state comparison data
    const dataPath = join(__dirname, '..', 'data', 'state-comparison-data.json')
    const rawData = readFileSync(dataPath, 'utf8')
    const { states } = JSON.parse(rawData)

    // Calculate scores for all states
    const statesWithScores = states.map(state => {
      const scores = calculateStateScore(state, states)
      return {
        ...state,
        scores
      }
    })

    // Sort by overall score (descending)
    statesWithScores.sort((a, b) => b.scores.overallScore - a.scores.overallScore)

    return statesWithScores
  } catch (error) {
    console.error('Error loading/scoring states:', error)
    throw error
  }
}

/**
 * Get states ranked by specific metric
 */
export function getStatesByMetric(metric) {
  const statesWithScores = getStatesWithScores()

  // Define sorting logic for each metric
  const sortFunctions = {
    overall: (a, b) => b.scores.overallScore - a.scores.overallScore,
    profitability: (a, b) => b.scores.components.profitabilityRatio - a.scores.components.profitabilityRatio,
    reimbursement: (a, b) => b.scores.components.reimbursementIndex - a.scores.components.reimbursementIndex,
    labor: (a, b) => b.scores.components.laborIndex - a.scores.components.laborIndex,
    market: (a, b) => b.scores.components.marketOpportunity - a.scores.components.marketOpportunity,
    quality: (a, b) => b.scores.components.qualityEnvironment - a.scores.components.qualityEnvironment
  }

  const sortFn = sortFunctions[metric] || sortFunctions.overall
  return [...statesWithScores].sort(sortFn)
}

/**
 * Get top and bottom performers
 */
export function getTopBottomStates(count = 10) {
  const allStates = getStatesWithScores()
  return {
    top10: allStates.slice(0, count),
    bottom10: allStates.slice(-count).reverse()
  }
}
