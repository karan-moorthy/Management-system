"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Loader } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetProfile } from "../api/use-get-profile";
import { useUpdateProfile } from "../api/use-update-profile";
import { useGetDesignations } from "../api/use-get-designations";
import { useCreateDesignation } from "../api/use-create-designation";
import { Dialog as AddDialog, DialogContent as AddDialogContent, DialogHeader as AddDialogHeader, DialogTitle as AddDialogTitle, DialogFooter } from "@/components/ui/dialog";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobileNo: z.string().optional(),
  native: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  experience: z.string().optional(),
  dateOfBirth: z.date().optional(),
  dateOfJoining: z.date().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProfileModal = ({ userId, open, onOpenChange }: EditProfileModalProps) => {
  const { data: profile, isLoading } = useGetProfile(userId);
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { data: customDesignations } = useGetDesignations();
  const { mutate: createDesignation, isPending: isCreatingDesignation } = useCreateDesignation();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [dobOpen, setDobOpen] = useState(false);
  const [dojOpen, setDojOpen] = useState(false);
  const [showAddDesignation, setShowAddDesignation] = useState(false);
  const [newDesignation, setNewDesignation] = useState("");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      mobileNo: "",
      native: "",
      designation: "",
      department: "",
      experience: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        email: profile.email || "",
        mobileNo: profile.mobileNo || "",
        native: profile.native || "",
        designation: profile.designation || "",
        department: profile.department || "",
        experience: profile.experience?.toString() || "",
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
        dateOfJoining: profile.dateOfJoining ? new Date(profile.dateOfJoining) : undefined,
      });
      setSkills(profile.skills || []);
    }
  }, [profile, form]);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile(
      {
        userId,
        name: values.name,
        email: values.email,
        mobileNo: values.mobileNo,
        native: values.native,
        designation: values.designation,
        department: values.department,
        experience: values.experience ? parseInt(values.experience) : undefined,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.toISOString() : undefined,
        skills,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleAddDesignation = () => {
    if (newDesignation.trim()) {
      createDesignation(
        { name: newDesignation.trim() },
        {
          onSuccess: (data) => {
            const designationName = newDesignation.trim();
            form.setValue("designation", designationName);
            setNewDesignation("");
            setShowAddDesignation(false);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobileNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Designation</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddDesignation(true)}
                          className="h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add New
                        </Button>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="intern">Intern</SelectItem>
                          <SelectItem value="junior_developer">Junior Developer</SelectItem>
                          <SelectItem value="senior_developer">Senior Developer</SelectItem>
                          <SelectItem value="team_lead">Team Lead</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="senior_manager">Senior Manager</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          {customDesignations?.map((designation) => (
                            <SelectItem key={designation.id} value={designation.name}>
                              {designation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="engineering">Engineering</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="native"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Native Place</FormLabel>
                      <FormControl>
                        <Input placeholder="City, Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (years)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover open={dobOpen} onOpenChange={setDobOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDobOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            defaultMonth={field.value || new Date(2000, 0)}
                            captionLayout="dropdown-buttons"
                            fromYear={1940}
                            toYear={new Date().getFullYear()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfJoining"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Joining</FormLabel>
                      <Popover open={dojOpen} onOpenChange={setDojOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setDojOpen(false);
                            }}
                            disabled={(date) => date > new Date("2100-01-01")}
                            defaultMonth={field.value || new Date()}
                            captionLayout="dropdown-buttons"
                            fromYear={2000}
                            toYear={2100}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Skills</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSkill} size="icon" variant="outline">
                    <Plus className="size-4" />
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((skill) => (
                      <div
                        key={skill}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-md flex items-center gap-2 text-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Updating..." : "Update Profile"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>

      {/* Add Designation Dialog */}
      <AddDialog open={showAddDesignation} onOpenChange={setShowAddDesignation}>
        <AddDialogContent>
          <AddDialogHeader>
            <AddDialogTitle>Add New Designation</AddDialogTitle>
          </AddDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Designation Name</label>
              <Input
                placeholder="Enter designation name"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDesignation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewDesignation("");
                setShowAddDesignation(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddDesignation}
              disabled={!newDesignation.trim() || isCreatingDesignation}
            >
              {isCreatingDesignation ? "Adding..." : "Add Designation"}
            </Button>
          </DialogFooter>
        </AddDialogContent>
      </AddDialog>
    </Dialog>
  );
};
