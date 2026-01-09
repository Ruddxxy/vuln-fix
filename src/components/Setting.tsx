"use client";
import { useLayoutEffect, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Check, AlertTriangle, Loader2, Eye, EyeOff, LogIn, LogOut, User } from "lucide-react";
import {
  getAuthState,
  initiateOAuthFlow,
  handleOAuthCallback,
  signOut as oauthSignOut,
  OAuthState,
} from "@/utils/google-oauth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import useModel from "@/hooks/useModel";
import { useSettingStore } from "@/store/setting";
import { cn } from "@/utils/style";
import { omit, capitalize } from "radash";
import ApiUsageStats from "./ApiUsageStats";
import { validateGoogleApiKey } from "@/utils/api-validation";
import { toast } from "sonner";
import { clearCache, getCacheStats } from "@/utils/research-cache";

type SettingProps = {
  open: boolean;
  onClose: () => void;
};

const BUILD_MODE = process.env.NEXT_PUBLIC_BUILD_MODE;

const formSchema = z.object({
  apiKey: z.string().optional(),
  apiProxy: z.string().optional(),
  accessPassword: z.string().optional(),
  authMethod: z.enum(['api-key', 'gemini-cli']),
  thinkingModel: z.string(),
  networkingModel: z.string(),
  searchModel: z.string(),
  researchDepth: z.number().min(1).max(3),
  language: z.string().optional(),
});

function convertModelName(name: string) {
  return name
    .split("-")
    .map((word) => capitalize(word))
    .join(" ");
}

function Setting({ open, onClose }: SettingProps) {
  const { t } = useTranslation();
  const { modelList, refresh, setModelList } = useModel();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingServerSettings, setIsLoadingServerSettings] = useState<boolean>(false);
  const [isValidatingApiKey, setIsValidatingApiKey] = useState<boolean>(false);
  const [apiKeyValidation, setApiKeyValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message: string;
  }>({ status: 'idle', message: '' });
  const [formReady, setFormReady] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; oldestEntry: number | null } | null>(null);
  const [oauthState, setOAuthState] = useState<OAuthState>({ isAuthenticated: false });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [oauthClientId, setOAuthClientId] = useState<string>('');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: async () => {
      return new Promise((resolve) => {
        const state = useSettingStore.getState();
        
        // Provide default empty values to prevent uncontrolled to controlled warning
        const defaults = {
          apiKey: state.apiKey || '',
          apiProxy: state.apiProxy || 'https://generativelanguage.googleapis.com', // Set default API endpoint
          accessPassword: state.accessPassword || '',
          authMethod: (state as { authMethod?: string }).authMethod || 'api-key',
          thinkingModel: state.thinkingModel || '',
          networkingModel: state.networkingModel || '',
          searchModel: state.searchModel || 'gemini-2.0-flash-lite',
          researchDepth: state.researchDepth || 2,
          language: state.language || 'en-US',
        };
        
        resolve(defaults);
        
        // Mark the form as ready after setting defaults
        setTimeout(() => setFormReady(true), 0);
      });
    },
  });

  const watchApiKey = form.watch("apiKey");
  const watchAuthMethod = form.watch("authMethod");

  // Load cache stats on mount
  useEffect(() => {
    if (open) {
      getCacheStats().then(setCacheStats);
    }
  }, [open]);

  // Check OAuth state on mount and when dialog opens
  useEffect(() => {
    if (open) {
      setOAuthState(getAuthState());
    }
  }, [open]);

  // Listen for OAuth callback messages from popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'GOOGLE_OAUTH_CALLBACK') {
        try {
          setIsSigningIn(true);
          await handleOAuthCallback(event.data.code, event.data.state);
          setOAuthState(getAuthState());
          toast.success("Successfully signed in with Google!");
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to complete sign-in');
        } finally {
          setIsSigningIn(false);
        }
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        toast.error(event.data.error || 'OAuth authentication failed');
        setIsSigningIn(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check for OAuth callback in URL (for same-window flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oauth_code');
    const state = params.get('oauth_state');

    if (code && state) {
      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      // Handle the callback
      setIsSigningIn(true);
      handleOAuthCallback(code, state)
        .then(() => {
          setOAuthState(getAuthState());
          toast.success("Successfully signed in with Google!");
        })
        .catch((error) => {
          console.error('OAuth callback error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to complete sign-in');
        })
        .finally(() => {
          setIsSigningIn(false);
        });
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (!oauthClientId) {
      toast.error("Please enter your Google OAuth Client ID first");
      return;
    }

    try {
      setIsSigningIn(true);
      await initiateOAuthFlow(oauthClientId);
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate sign-in');
      setIsSigningIn(false);
    }
  }, [oauthClientId]);

  const handleGoogleSignOut = useCallback(() => {
    oauthSignOut();
    setOAuthState({ isAuthenticated: false });
    toast.success("Signed out from Google");
  }, []);

  function handleClose(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: z.infer<typeof formSchema>) {
    const { update } = useSettingStore.getState();
    
    // Ensure apiProxy is never empty or null - use the default
    const valuesToUpdate = {
      ...values,
      apiProxy: values.apiProxy || 'https://generativelanguage.googleapis.com'
    };
    
    update(valuesToUpdate);
    onClose();
  }

  async function validateApiKey(key: string) {
    if (!key) {
      setApiKeyValidation({ status: 'idle', message: '' });
      return;
    }
    
    try {
      setApiKeyValidation({ status: 'validating', message: 'Validating API key...' });
      setIsValidatingApiKey(true);
      
      const result = await validateGoogleApiKey(key);
      
      if (result.isValid) {
        setApiKeyValidation({ status: 'valid', message: result.message });
        
        // Update model list if models were returned
        if (result.models && result.models.length > 0) {
          setModelList(result.models);
          
          // Set default models if not already set
          if (!form.getValues("thinkingModel")) {
            // Prefer Gemini Pro model if available, or the first available model
            const defaultModel = result.models.find(model => 
              model.includes('gemini-pro') || model.includes('pro')
            ) || result.models[0];
            form.setValue("thinkingModel", defaultModel);
          }
          
          if (!form.getValues("networkingModel")) {
            // Prefer Gemini Pro model if available, or the first available model
            const defaultModel = result.models.find(model =>
              model.includes('gemini-pro') || model.includes('pro')
            ) || result.models[0];
            form.setValue("networkingModel", defaultModel);
          }

          if (!form.getValues("searchModel")) {
            // Prefer flash-lite model for search (highest RPM), fallback to flash
            const searchModel = result.models.find(model =>
              model.includes('flash-lite')
            ) || result.models.find(model =>
              model.includes('flash')
            ) || result.models[0];
            form.setValue("searchModel", searchModel);
          }

          toast.success("Models loaded successfully");
        }
      } else {
        setApiKeyValidation({ status: 'invalid', message: result.message });
      }
    } catch (error) {
      console.error("API key validation error:", error);
      setApiKeyValidation({ 
        status: 'invalid', 
        message: error instanceof Error ? error.message : "Unknown error validating API key"
      });
    } finally {
      setIsValidatingApiKey(false);
    }
  }

  // Handle API key validation when it changes
  useLayoutEffect(() => {
    const handler = setTimeout(() => {
      if (watchApiKey && watchApiKey !== useSettingStore.getState().apiKey) {
        validateApiKey(watchApiKey);
      }
    }, 500); // Debounce validation by 500ms
    
    return () => clearTimeout(handler);
  }, [watchApiKey]);

  async function fetchModelList() {
    try {
      setIsRefreshing(true);
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function fetchServerSettings() {
    try {
      setIsLoadingServerSettings(true);
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch server settings');
      }
      const settings = await response.json();
      
      // Update form values with server settings
      if (settings.apiKey) {
        form.setValue('apiKey', settings.apiKey);
      }
      if (settings.apiProxy) {
        form.setValue('apiProxy', settings.apiProxy);
      }
      if (settings.accessPassword) {
        form.setValue('accessPassword', settings.accessPassword);
      }
      
      // Also update the store
      const { update } = useSettingStore.getState();
      update({
        apiKey: settings.apiKey || '',
        apiProxy: settings.apiProxy || '',
        accessPassword: settings.accessPassword || '',
      });
      
    } catch (error) {
      console.error('Error fetching server settings:', error);
    } finally {
      setIsLoadingServerSettings(false);
    }
  }

  useLayoutEffect(() => {
    if (open) {
      refresh();
      fetchServerSettings();
      
      // Check if we need to validate existing API key
      const currentApiKey = useSettingStore.getState().apiKey;
      if (currentApiKey) {
        validateApiKey(currentApiKey);
      }
    }
  }, [open, refresh]);

  // Wait for form to be ready before rendering
  if (!formReady && open) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Loading Settings</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading settings...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("setting.title")}</DialogTitle>
          <DialogDescription>{t("setting.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4">
            <Tabs defaultValue="local">
              <TabsList
                className={cn("w-full mb-1", {
                  hidden: BUILD_MODE === "export",
                })}
              >
                <TabsTrigger className="w-1/3" value="local">
                  {t("setting.local")}
                </TabsTrigger>
                <TabsTrigger className="w-1/3" value="server">
                  {t("setting.server")}
                </TabsTrigger>
                <TabsTrigger className="w-1/3" value="usage">
                  API Limits
                </TabsTrigger>
              </TabsList>
              <TabsContent className="space-y-4" value="local">
                <FormField
                  control={form.control}
                  name="authMethod"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="col-span-1">
                        Authentication Method
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="api-key">
                              API Key (Standard limits: 5 RPM, 20 RPD)
                            </SelectItem>
                            <SelectItem value="gemini-cli">
                              Google Account / Gemini CLI (Higher limits: 60 RPM, 1000 RPD)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      {field.value === 'gemini-cli' && (
                        <div className="mt-3 space-y-3">
                          {oauthState.isAuthenticated ? (
                            <Alert className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
                              <AlertDescription className="text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>Signed in as <strong>{oauthState.userEmail || 'Google User'}</strong></span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleGoogleSignOut}
                                  className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-200 dark:hover:bg-green-900"
                                >
                                  <LogOut className="h-3 w-3 mr-1" />
                                  Sign Out
                                </Button>
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <>
                              <Alert className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800">
                                <AlertDescription className="text-xs">
                                  <strong>Google OAuth Mode:</strong> Sign in with your Google account to get 50x higher rate limits (60 RPM, 1000 RPD vs 5 RPM, 20 RPD).
                                </AlertDescription>
                              </Alert>

                              <div className="space-y-2">
                                <Label className="text-xs">
                                  Google OAuth Client ID
                                  <span className="ml-1 text-red-500">*</span>
                                </Label>
                                <Input
                                  type="text"
                                  placeholder="Enter your OAuth Client ID from Google Cloud Console"
                                  value={oauthClientId}
                                  onChange={(e) => setOAuthClientId(e.target.value)}
                                  className="text-xs"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Create one at{' '}
                                  <a
                                    href="https://console.cloud.google.com/apis/credentials"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    Google Cloud Console
                                  </a>
                                  {' '}→ Create OAuth client ID → Web application
                                </p>
                              </div>

                              <Button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isSigningIn || !oauthClientId}
                                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                              >
                                {isSigningIn ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                  </>
                                ) : (
                                  <>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Sign in with Google
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                {watchAuthMethod !== 'gemini-cli' && (
                  <>
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem className="from-item">
                          <FormLabel className="col-span-1">
                            {t("setting.apiKeyLabel")}
                            <span className="ml-1 text-red-500">*</span>
                          </FormLabel>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                              <FormControl>
                                <Input
                                  type={showApiKey ? "text" : "password"}
                                  placeholder={t("setting.apiKeyPlaceholder")}
                                  {...field}
                                  className="pr-10"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                            {apiKeyValidation.status === 'validating' && (
                              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            )}
                            {apiKeyValidation.status === 'valid' && (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                            {apiKeyValidation.status === 'invalid' && (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          {apiKeyValidation.status === 'valid' && (
                            <Alert variant="success" className="mt-2 bg-green-50 text-green-700 border-green-200">
                              <AlertDescription className="text-xs">
                                {apiKeyValidation.message}
                              </AlertDescription>
                            </Alert>
                          )}
                          {apiKeyValidation.status === 'invalid' && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertDescription className="text-xs">
                                {apiKeyValidation.message}
                              </AlertDescription>
                            </Alert>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apiProxy"
                      render={({ field }) => (
                        <FormItem className="from-item">
                          <FormLabel className="col-span-1">
                            {t("setting.apiUrlLabel")}
                          </FormLabel>
                          <FormControl className="col-span-3">
                            <Input
                              placeholder="https://generativelanguage.googleapis.com"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </TabsContent>
              <TabsContent className="space-y-4" value="server">
                <FormField
                  control={form.control}
                  name="accessPassword"
                  render={({ field }) => (
                    <FormItem className="from-item">
                      <FormLabel className="col-span-1">
                        {t("setting.accessPassword")}
                        <span className="ml-1 text-red-500">*</span>
                      </FormLabel>
                      <FormControl className="col-span-3">
                        <Input
                          type="password"
                          placeholder={t("setting.accessPasswordPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              <TabsContent className="space-y-4" value="usage">
                <div className="p-1">
                  <ApiUsageStats />
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p className="mb-2">Rate limits are applied per project, not per API key.</p>
                    <p>Limits vary by model (see <a href="https://ai.google.dev/gemini-api/docs/rate-limits" 
                      target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI docs</a>):</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Gemini 2.5 Pro Exp: 2 RPM, 50 RPD</li>
                      <li>Gemini 2.0 Flash: 15 RPM, 1,500 RPD</li>
                      <li>Gemini 1.5 Pro: 2 RPM, 50 RPD</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="thinkingModel"
              render={({ field }) => (
                <FormItem className="from-item">
                  <FormLabel className="col-span-1">
                    {t("setting.thinkingModel")}
                  </FormLabel>
                  <FormControl>
                    <div className="col-span-3 flex gap-1">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className={cn({ hidden: modelList.length === 0 })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-sm:max-h-72">
                          {modelList.map((name) => {
                            return (
                              <SelectItem key={name} value={name}>
                                {convertModelName(name)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        className={cn("w-full", {
                          hidden: modelList.length > 0,
                        })}
                        type="button"
                        variant="outline"
                        onClick={() => fetchModelList()}
                      >
                        <RefreshCw
                          className={isRefreshing ? "animate-spin" : ""}
                        />{" "}
                        {t("setting.refresh")}
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="networkingModel"
              render={({ field }) => (
                <FormItem className="from-item">
                  <FormLabel className="col-span-1">
                    {t("setting.networkingModel")}
                  </FormLabel>
                  <FormControl>
                    <div className="col-span-3 flex gap-1">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className={cn({ hidden: modelList.length === 0 })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-sm:max-h-72">
                          {modelList.map((name) => {
                            return (
                              <SelectItem key={name} value={name}>
                                {convertModelName(name)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        className={cn("w-full", {
                          hidden: modelList.length > 0,
                        })}
                        type="button"
                        variant="outline"
                        onClick={() => fetchModelList()}
                      >
                        <RefreshCw
                          className={isRefreshing ? "animate-spin" : ""}
                        />{" "}
                        {t("setting.refresh")}
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="searchModel"
              render={({ field }) => (
                <FormItem className="from-item">
                  <FormLabel className="col-span-1">
                    {t("setting.searchModel")}
                  </FormLabel>
                  <FormControl>
                    <div className="col-span-3 flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            className={cn({ hidden: modelList.length === 0 })}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-sm:max-h-72">
                            {modelList.map((name) => {
                              return (
                                <SelectItem key={name} value={name}>
                                  {convertModelName(name)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          className={cn("w-full", {
                            hidden: modelList.length > 0,
                          })}
                          type="button"
                          variant="outline"
                          onClick={() => fetchModelList()}
                        >
                          <RefreshCw
                            className={isRefreshing ? "animate-spin" : ""}
                          />{" "}
                          {t("setting.refresh")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("setting.searchModelDescription")}
                      </p>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="researchDepth"
              render={({ field }) => (
                <FormItem className="from-item">
                  <FormLabel className="col-span-1">
                    {t("setting.researchDepth")}
                  </FormLabel>
                  <FormControl>
                    <div className="col-span-3 flex flex-col gap-1">
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={1}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <span className="text-sm font-medium w-6 text-center">
                          {field.value}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("setting.researchDepthDescription")}
                      </p>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem className="from-item">
                  <FormLabel className="col-span-1">
                    {t("setting.language")}
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-sm:max-h-48">
                        <SelectItem value="en-US">English</SelectItem>
                        <SelectItem value="zh-CN">简体中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Research Cache Section */}
            <div className="space-y-2">
              <Label>Research Cache</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {cacheStats ? `${cacheStats.count} cached queries` : "Loading..."}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await clearCache();
                    setCacheStats({ count: 0, oldestEntry: null });
                    toast.success("Research cache cleared");
                  }}
                  disabled={cacheStats?.count === 0}
                >
                  Clear Cache
                </Button>
              </div>
              {cacheStats?.oldestEntry && (
                <p className="text-xs text-muted-foreground">
                  Oldest entry: {new Date(cacheStats.oldestEntry).toLocaleDateString()}
                </p>
              )}
            </div>
          </form>
        </Form>
        <DialogFooter className="mt-2 flex-row sm:justify-between sm:space-x-0 gap-3">
          <Button className="flex-1" variant="outline" onClick={onClose}>
            {t("setting.cancel")}
          </Button>
          <Button
            className="flex-1"
            type="submit"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {t("setting.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Setting;
