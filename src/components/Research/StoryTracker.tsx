"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Radar,
  Bell,
  BellOff,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clipboard,
  Info,
  Clock,
  PlusCircle,
  X,
  ChevronDown,
  FileEdit,
  ExternalLink,
  MessageSquare,
  Link2,
  Eye,
  EyeOff,
  CheckCircle2,
  History,
  Trash
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrackedStory, StoryUpdate } from "@/types";
import {
  checkForUpdates,
  createTrackedStory,
  markUpdatesAsRead,
  setUpdateFrequency,
  toggleNotifications,
  addTrackingUrl,
  removeTrackingUrl,
  createNewVersion
} from "@/utils/story-tracker";
import MilkdownEditor from "@/components/MilkdownEditor";
import { useTaskStore } from "@/store/task";

interface StoryTrackerProps {
  finalReport?: string;
}

export default function StoryTracker({ finalReport = "" }: StoryTrackerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const taskStore = useTaskStore();
  
  const [trackedStories, setTrackedStories] = useState<TrackedStory[]>([]);
  const [activeStory, setActiveStory] = useState<TrackedStory | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [newTrackingUrl, setNewTrackingUrl] = useState("");
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [contentEditMode, setContentEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [changeDescription, setChangeDescription] = useState("");
  
  // On component mount, check local storage for tracked stories
  useEffect(() => {
    const storedStories = localStorage.getItem('trackedStories');
    if (storedStories) {
      try {
        const parsedStories = JSON.parse(storedStories);
        setTrackedStories(parsedStories);
        
        // If we have stories, set the first one as active
        if (parsedStories.length > 0) {
          setActiveStory(parsedStories[0]);
        }
      } catch (e) {
        console.error('Failed to parse stored stories:', e);
      }
    }
  }, []);
  
  // Save tracked stories to local storage whenever they change
  useEffect(() => {
    if (trackedStories.length > 0) {
      localStorage.setItem('trackedStories', JSON.stringify(trackedStories));
    }
  }, [trackedStories]);
  
  // Track the current report
  function handleTrackStory() {
    if (!finalReport || finalReport.trim() === "") {
      toast({
        title: "No report content",
        description: "Please generate a report first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsTracking(true);
    
    try {
      const newStory = createTrackedStory(
        taskStore.tasks,
        "Report: " + taskStore.tasks[0]?.query || "Unnamed Research",
        finalReport
      );
      
      setTrackedStories(prev => [newStory, ...prev]);
      setActiveStory(newStory);
      
      toast({
        title: "Story tracking enabled",
        description: "We'll monitor for updates to this story."
      });
    } catch (error) {
      console.error('Error tracking story:', error);
      toast({
        title: "Failed to track story",
        description: "An error occurred while setting up tracking.",
        variant: "destructive"
      });
    } finally {
      setIsTracking(false);
    }
  }
  
  // Check for updates to the active story
  async function handleCheckUpdates() {
    if (!activeStory) return;
    
    setCheckingUpdates(true);
    try {
      const updates = await checkForUpdates(activeStory);
      
      if (updates.length === 0) {
        toast({
          title: "No new updates",
          description: "No updates found for this story."
        });
        return;
      }
      
      // Add updates to the story
      const updatedStory = {
        ...activeStory,
        updates: [...updates, ...activeStory.updates],
        lastUpdated: new Date().toISOString()
      };
      
      // Update the active story and the list of tracked stories
      setActiveStory(updatedStory);
      setTrackedStories(prev => 
        prev.map(story => story.id === updatedStory.id ? updatedStory : story)
      );
      
      toast({
        title: `${updates.length} new update${updates.length > 1 ? 's' : ''}`,
        description: "New information is available for this story."
      });
    } catch (error) {
      console.error('Error checking for updates:', error);
      toast({
        title: "Update check failed",
        description: "Could not check for story updates.",
        variant: "destructive"
      });
    } finally {
      setCheckingUpdates(false);
    }
  }
  
  // Mark updates as read
  function handleMarkAsRead(updateIds?: string[]) {
    if (!activeStory) return;
    
    const updatedStory = markUpdatesAsRead(activeStory, updateIds);
    
    setActiveStory(updatedStory);
    setTrackedStories(prev => 
      prev.map(story => story.id === updatedStory.id ? updatedStory : story)
    );
  }
  
  // Change update frequency
  function handleUpdateFrequency(frequency: 'hourly' | 'daily' | 'weekly') {
    if (!activeStory) return;
    
    const updatedStory = setUpdateFrequency(activeStory, frequency);
    
    setActiveStory(updatedStory);
    setTrackedStories(prev => 
      prev.map(story => story.id === updatedStory.id ? updatedStory : story)
    );
    
    toast({
      title: "Update frequency changed",
      description: `Story will now be checked ${frequency}.`
    });
  }
  
  // Toggle notifications
  function handleToggleNotifications() {
    if (!activeStory) return;
    
    const updatedStory = toggleNotifications(activeStory);
    
    setActiveStory(updatedStory);
    setTrackedStories(prev => 
      prev.map(story => story.id === updatedStory.id ? updatedStory : story)
    );
    
    toast({
      title: "Notifications " + (updatedStory.tracking.notificationsEnabled ? "enabled" : "disabled"),
      description: updatedStory.tracking.notificationsEnabled 
        ? "You'll receive notifications about this story." 
        : "You won't receive notifications about this story."
    });
  }
  
  // Add a new tracking URL
  function handleAddTrackingUrl() {
    if (!activeStory || !newTrackingUrl) return;
    
    try {
      const updatedStory = addTrackingUrl(activeStory, newTrackingUrl);
      
      setActiveStory(updatedStory);
      setTrackedStories(prev => 
        prev.map(story => story.id === updatedStory.id ? updatedStory : story)
      );
      
      setNewTrackingUrl("");
      
      toast({
        title: "Tracking URL added",
        description: "We'll monitor this URL for updates."
      });
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive"
      });
    }
  }
  
  // Remove a tracking URL
  function handleRemoveTrackingUrl(urlId: string) {
    if (!activeStory) return;
    
    const updatedStory = removeTrackingUrl(activeStory, urlId);
    
    setActiveStory(updatedStory);
    setTrackedStories(prev => 
      prev.map(story => story.id === updatedStory.id ? updatedStory : story)
    );
    
    toast({
      title: "Tracking URL removed",
      description: "This URL will no longer be monitored."
    });
  }
  
  // Save a new version of the story content
  function handleSaveNewVersion() {
    if (!activeStory || !editedContent || !changeDescription) return;
    
    const updatedStory = createNewVersion(
      activeStory,
      editedContent,
      changeDescription
    );
    
    setActiveStory(updatedStory);
    setTrackedStories(prev => 
      prev.map(story => story.id === updatedStory.id ? updatedStory : story)
    );
    
    setContentEditMode(false);
    setChangeDescription("");
    
    toast({
      title: "New version saved",
      description: "A new version of your story has been saved."
    });
  }
  
  // Switch to a different tracked story
  function handleSwitchStory(storyId: string) {
    const story = trackedStories.find(s => s.id === storyId);
    if (story) {
      setActiveStory(story);
    }
  }
  
  // Delete a tracked story
  function handleDeleteStory(storyId: string) {
    setTrackedStories(prev => prev.filter(story => story.id !== storyId));
    
    if (activeStory?.id === storyId) {
      setActiveStory(trackedStories.length > 1 ? trackedStories[0] : null);
    }
    
    toast({
      title: "Story deleted",
      description: "The tracked story has been deleted."
    });
  }
  
  // Start editing content
  function handleStartEditingContent() {
    if (!activeStory) return;
    
    // Get the latest version of content
    const latestVersion = activeStory.contentVersions[activeStory.contentVersions.length - 1];
    setEditedContent(latestVersion.content);
    setContentEditMode(true);
  }
  
  // Render significance badge
  function renderSignificanceBadge(significance: StoryUpdate['significance']) {
    let color;
    switch (significance) {
      case 'high':
        color = 'bg-red-100 text-red-800 border-red-200';
        break;
      case 'medium':
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        break;
      case 'low':
      default:
        color = 'bg-blue-100 text-blue-800 border-blue-200';
        break;
    }
    
    return (
      <Badge variant="outline" className={color}>
        {significance.charAt(0).toUpperCase() + significance.slice(1)}
      </Badge>
    );
  }
  
  // Count unread updates
  const unreadCount = activeStory?.updates.filter(update => !update.isRead).length || 0;
  
  // Get the most recent version of the story content
  const latestContent = activeStory?.contentVersions[activeStory.contentVersions.length - 1].content || "";
  
  // No story tracking available yet
  if (trackedStories.length === 0 && !isTracking) {
    return (
      <Card className="w-full mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Story Tracker</CardTitle>
          <CardDescription>
            Monitor developing news stories and receive updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Radar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No stories being tracked</h3>
            <p className="text-muted-foreground mb-4">
              Track your current report to receive updates when new information becomes available.
            </p>
            <Button
              onClick={handleTrackStory}
              disabled={isTracking || !finalReport}
              className="gap-2"
            >
              {isTracking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
              Start tracking this story
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Loading state while setting up tracking
  if (isTracking) {
    return (
      <Card className="w-full mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Story Tracker</CardTitle>
          <CardDescription>
            Setting up story tracking...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">
              Analyzing content and setting up monitoring...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // No active story selected
  if (!activeStory) {
    return (
      <Card className="w-full mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Story Tracker</CardTitle>
          <CardDescription>
            Select a story to track.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Please select a story to view tracking information.
            </p>
            <Button
              onClick={handleTrackStory}
              disabled={isTracking || !finalReport}
              className="gap-2"
            >
              <Radar className="h-4 w-4" />
              Track current report
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{activeStory.title}</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Tracking since {new Date(activeStory.dateCreated).toLocaleDateString()}
              {activeStory.lastUpdated !== activeStory.dateCreated && 
                ` • Last updated ${new Date(activeStory.lastUpdated).toLocaleDateString()}`}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {activeStory.tracking.notificationsEnabled ? (
              <Button
                variant="outline"
                size="icon"
                title="Disable notifications"
                onClick={handleToggleNotifications}
              >
                <Bell className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                title="Enable notifications"
                onClick={handleToggleNotifications}
              >
                <BellOff className="h-4 w-4" />
              </Button>
            )}
            
            <Select
              value={activeStory.tracking.updateFrequency}
              onValueChange={(value: string) => {
                if (value === 'hourly' || value === 'daily' || value === 'weekly') {
                  handleUpdateFrequency(value);
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Check frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Check hourly</SelectItem>
                <SelectItem value="daily">Check daily</SelectItem>
                <SelectItem value="weekly">Check weekly</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={handleCheckUpdates}
              disabled={checkingUpdates}
              className="gap-2"
            >
              {checkingUpdates ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check for updates
            </Button>
            
            <Select
              value={activeStory.id}
              onValueChange={handleSwitchStory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Switch story" />
              </SelectTrigger>
              <SelectContent>
                {trackedStories.map(story => (
                  <SelectItem key={story.id} value={story.id}>
                    {story.title.length > 25 
                      ? `${story.title.substring(0, 25)}...` 
                      : story.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {activeStory.keywords.map((keyword, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <Tabs defaultValue="updates" className="w-full">
        <TabsList className="px-6">
          <TabsTrigger value="updates" className="relative">
            Updates
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>
        
        <CardContent className="pt-4">
          <TabsContent value="updates" className="mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Story Updates</h3>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8"
                  onClick={() => handleMarkAsRead()}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark all as read
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8"
                  onClick={() => setShowAllUpdates(!showAllUpdates)}
                >
                  {showAllUpdates ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Show unread only
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Show all updates
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {activeStory.updates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-muted" />
                <p>No updates yet. Check back later or click "Check for updates" to manually check.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeStory.updates
                  .filter(update => showAllUpdates || !update.isRead)
                  .map(update => (
                    <div 
                      key={update.id} 
                      className={`border rounded-md p-4 ${!update.isRead ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          {update.type === 'new_source' && <Link2 className="h-5 w-5 text-blue-500 mt-0.5" />}
                          {update.type === 'source_update' && <RefreshCw className="h-5 w-5 text-green-500 mt-0.5" />}
                          {update.type === 'fact_correction' && <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />}
                          {update.type === 'new_development' && <Info className="h-5 w-5 text-purple-500 mt-0.5" />}
                          {update.type === 'perspective_change' && <MessageSquare className="h-5 w-5 text-indigo-500 mt-0.5" />}
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{update.title}</h4>
                              {renderSignificanceBadge(update.significance)}
                            </div>
                            
                            <p className="text-sm mt-1 text-muted-foreground">
                              {update.content}
                            </p>
                            
                            {update.suggestedRevision && (
                              <div className="mt-2 text-xs border-l-2 border-blue-500 pl-2 py-1 bg-blue-50 dark:bg-blue-950 rounded-sm">
                                <span className="font-medium">Suggested action: </span>
                                {update.suggestedRevision}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                              <time>{new Date(update.date).toLocaleString()}</time>
                              
                              {update.sourceUrl && (
                                <a 
                                  href={update.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {update.sourceName || 'View source'}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {!update.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead([update.id])}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="content" className="mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">
                Story Content {showVersionHistory && '- Version History'}
              </h3>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                >
                  <History className="h-3.5 w-3.5" />
                  {showVersionHistory ? 'Show current version' : 'Show version history'}
                </Button>
                
                {!contentEditMode && !showVersionHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8"
                    onClick={handleStartEditingContent}
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                    Edit content
                  </Button>
                )}
              </div>
            </div>
            
            {showVersionHistory ? (
              <div className="space-y-4">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <Accordion type="single" collapsible className="w-full">
                    {[...activeStory.contentVersions].reverse().map((version, index) => (
                      <AccordionItem key={version.id} value={version.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="rounded-full px-2 py-0 h-5 w-5 flex items-center justify-center">
                              {activeStory.contentVersions.length - index}
                            </Badge>
                            <span>{version.changeDescription || 'Version update'}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(version.date).toLocaleString()}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="border rounded-md p-4 mt-2 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                            {version.content}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </div>
            ) : contentEditMode ? (
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2">Edit Content</h4>
                  <div className="mb-4">
                    <MilkdownEditor
                      value={editedContent}
                      onChange={setEditedContent}
                    />
                  </div>
                  
                  <h4 className="text-sm font-medium mb-2">Change Description</h4>
                  <Input
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    placeholder="Describe your changes (e.g., 'Updated with new information from BBC')"
                    className="mb-4"
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setContentEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveNewVersion}
                      disabled={!editedContent || !changeDescription}
                    >
                      Save New Version
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-4">
                <div className="prose prose-sm dark:prose-invert">
                  <MilkdownEditor
                    value={latestContent}
                    readOnly={true}
                  />
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sources" className="mt-0">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Story Sources</h3>
              
              {activeStory.sources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-2 text-muted" />
                  <p>No sources found for this story.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStory.sources.map(source => (
                    <div key={source.id} className="border rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {source.title || source.url}
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Last checked: {new Date(source.lastChecked).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Story Entities</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-md p-3">
                  <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">People</h4>
                  {activeStory.entities.people.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No people identified</div>
                  ) : (
                    <ul className="space-y-1">
                      {activeStory.entities.people.map((person, idx) => (
                        <li key={idx} className="text-sm">{person}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="border rounded-md p-3">
                  <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">Organizations</h4>
                  {activeStory.entities.organizations.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No organizations identified</div>
                  ) : (
                    <ul className="space-y-1">
                      {activeStory.entities.organizations.map((org, idx) => (
                        <li key={idx} className="text-sm">{org}</li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="border rounded-md p-3">
                  <h4 className="text-xs uppercase text-muted-foreground font-medium tracking-wide mb-2">Locations</h4>
                  {activeStory.entities.locations.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No locations identified</div>
                  ) : (
                    <ul className="space-y-1">
                      {activeStory.entities.locations.map((location, idx) => (
                        <li key={idx} className="text-sm">{location}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tracking" className="mt-0">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Tracking URLs</h3>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-8">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add URL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add tracking URL</DialogTitle>
                      <DialogDescription>
                        Add a URL to monitor for updates to this story.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <Input
                        value={newTrackingUrl}
                        onChange={(e) => setNewTrackingUrl(e.target.value)}
                        placeholder="https://example.com/article"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewTrackingUrl("")}>Cancel</Button>
                      <Button onClick={handleAddTrackingUrl}>Add URL</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {activeStory.tracking.urls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-2 text-muted" />
                  <p>No tracking URLs configured.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStory.tracking.urls.map(url => (
                    <div key={url.id} className="border rounded-md p-3 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {url.domain}
                          </a>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Last checked: {new Date(url.lastChecked).toLocaleString()}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveTrackingUrl(url.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 border-t pt-4">
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => handleDeleteStory(activeStory.id)}
              >
                <Trash className="h-4 w-4" />
                Delete this tracked story
              </Button>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="border-t flex justify-between">
        <p className="text-xs text-muted-foreground">
          Story updates are simulated for demo purposes. In a production environment, we would make real API calls.
        </p>
      </CardFooter>
    </Card>
  );
}