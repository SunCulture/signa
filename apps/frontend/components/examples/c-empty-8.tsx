import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { UsersIcon, UserPlusIcon } from "lucide-react"

export function Pattern() {
  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team and their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon
                />
              </EmptyMedia>
              <EmptyTitle>No team members</EmptyTitle>
              <EmptyDescription>
                Invite people to collaborate on this project.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm">
                <UserPlusIcon data-icon="inline-start" />
                Invite People
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  )
}