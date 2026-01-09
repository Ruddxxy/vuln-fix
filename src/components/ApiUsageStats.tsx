import { useState, useEffect } from "react";
import { useSettingStore } from "@/store/setting";
import rateLimiter from "@/utils/rate-limiter";
import { getModelLimits } from "@/constants/models";
import { BarChart3, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress
} from "@/components/ui/progress";

type UsageStats = {
  rpm: { current: number; limit: number; percentage: number };
  rpd: { current: number; limit: number; percentage: number };
};

// Store the request counts (fake data for now)
// In a real implementation, this would be obtained from the rateLimiter
const requestCounts: Record<string, {rpm: number, rpd: number}> = {};

export default function ApiUsageStats() {
  const { thinkingModel } = useSettingStore();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isExhausted, setIsExhausted] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Refresh stats once per minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCounter(prev => prev + 1);
    }, 60000); // Change to 60 seconds instead of 10
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  useEffect(() => {
    if (!thinkingModel) return;

    // Get the limits for current model from the constants
    const limits = getModelLimits(thinkingModel);

    // Check exhausted, unavailable, and cooldown status
    setIsExhausted(rateLimiter.isModelExhausted(thinkingModel));
    setIsUnavailable(rateLimiter.isModelDeprecated(thinkingModel));
    const remaining = rateLimiter.getCooldownTimeRemaining(thinkingModel);
    setCooldownRemaining(remaining);

    // Initialize request counts if not exist
    if (!requestCounts[thinkingModel]) {
      requestCounts[thinkingModel] = {
        rpm: 0,
        rpd: 0
      };
    }

    // If model is in cooldown, show it's at the limit
    if (rateLimiter.isInCooldown(thinkingModel)) {
      const calculatedStats: UsageStats = {
        rpm: {
          current: limits.rpm,
          limit: limits.rpm,
          percentage: 100
        },
        rpd: {
          current: requestCounts[thinkingModel].rpd,
          limit: limits.rpd,
          percentage: (requestCounts[thinkingModel].rpd / limits.rpd) * 100
        }
      };

      setStats(calculatedStats);
      return;
    }

    // Otherwise, show current counts (could be 0 if no requests made)
    const calculatedStats: UsageStats = {
      rpm: {
        current: requestCounts[thinkingModel].rpm,
        limit: limits.rpm,
        percentage: (requestCounts[thinkingModel].rpm / limits.rpm) * 100
      },
      rpd: {
        current: requestCounts[thinkingModel].rpd,
        limit: limits.rpd,
        percentage: (requestCounts[thinkingModel].rpd / limits.rpd) * 100
      }
    };

    setStats(calculatedStats);

  }, [thinkingModel, refreshCounter]);

  // Subscribe to the rateLimiter.trackRequest method to update our counts
  useEffect(() => {
    // This is a mock implementation as we can't modify the rateLimiter directly
    // In a real implementation, the rateLimiter would expose an event or method to get current counts
    
    // Create a proxy for trackRequest to count requests
    const originalTrackRequest = rateLimiter.trackRequest;
    rateLimiter.trackRequest = function(model: string) {
      // Call the original method
      originalTrackRequest.call(rateLimiter, model);
      
      // Update our local counts
      if (!requestCounts[model]) {
        requestCounts[model] = { rpm: 0, rpd: 0 };
      }
      
      requestCounts[model].rpm += 1;
      requestCounts[model].rpd += 1;
      
      // Force a refresh of the stats
      setRefreshCounter(prev => prev + 1);
    };
    
    // Reset RPM counts every minute
    const resetRpmInterval = setInterval(() => {
      Object.keys(requestCounts).forEach(model => {
        requestCounts[model].rpm = 0;
      });
    }, 60000);
    
    // Reset RPD counts every day
    const resetRpdInterval = setInterval(() => {
      Object.keys(requestCounts).forEach(model => {
        requestCounts[model].rpd = 0;
      });
    }, 24 * 60 * 60 * 1000);
    
    return () => {
      // Restore the original method when component unmounts
      rateLimiter.trackRequest = originalTrackRequest;
      clearInterval(resetRpmInterval);
      clearInterval(resetRpdInterval);
    };
  }, []);

  if (!stats) return null;

  return (
    <Card className={isUnavailable ? "border-orange-500" : isExhausted ? "border-red-500" : cooldownRemaining > 0 ? "border-yellow-500" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          API Usage
          <span className="ml-1 text-xs text-muted-foreground">({thinkingModel})</span>
        </CardTitle>
        <CardDescription className="text-xs">
          {isUnavailable ? (
            <span className="text-orange-500 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Model unavailable - update in settings
            </span>
          ) : isExhausted ? (
            <span className="text-red-500 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Quota exhausted - try a different model
            </span>
          ) : cooldownRemaining > 0 ? (
            <span className="text-yellow-600">
              Cooling down: {cooldownRemaining}s remaining
            </span>
          ) : (
            "Free tier limits for the current model"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Requests/min</span>
              <span className={stats.rpm.percentage > 80 ? 'text-red-500' : 'text-gray-500'}>
                {stats.rpm.current}/{stats.rpm.limit}
              </span>
            </div>
            <Progress value={stats.rpm.percentage} className="h-1" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Requests/day</span>
              <span className={stats.rpd.percentage > 80 ? 'text-red-500' : 'text-gray-500'}>
                {stats.rpd.current}/{stats.rpd.limit}
              </span>
            </div>
            <Progress value={stats.rpd.percentage} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 